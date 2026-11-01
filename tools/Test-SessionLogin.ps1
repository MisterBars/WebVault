<#
.SYNOPSIS
Компиляция App_Code, реальный parser входа и запись cookies без SQL/IIS.
Не выполняет login-транзакцию и не подтверждает работу SQL на стенде.
#>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
$repo = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
$framework = [System.Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()
$csc = Join-Path $framework 'csc.exe'
if (-not (Test-Path -LiteralPath $csc -PathType Leaf)) { throw 'Нужен Windows PowerShell с .NET Framework 4.x' }
$sources = @(Get-ChildItem (Join-Path $repo 'src\WebVault.Web\App_Code') -Filter '*.cs' | Sort-Object Name | ForEach-Object { $_.FullName })
if ($sources.Count -eq 0) { throw 'Исходники App_Code не найдены' }
$references = @('System.dll','System.Core.dll','System.Configuration.dll','System.Data.dll','System.Web.dll','System.Web.Extensions.dll') | ForEach-Object { '/reference:' + (Join-Path $framework $_) }
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ('WVSessionLogin-' + [Guid]::NewGuid().ToString('N'))
[void][System.IO.Directory]::CreateDirectory($temp)
try {
    $harness = @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Web;
using System.Web.Script.Serialization;
using WebVault;
namespace WebVaultSessionLoginTests
{
 public static class Harness
 {
  static readonly DateTime Now=new DateTime(2026,11,1,10,0,0,DateTimeKind.Utc);
  static void Check(bool value,string message){if(!value)throw new Exception(message);}
  static string Body(object flag,bool present=true){Dictionary<string,object> p=new Dictionary<string,object>();p["login"]="tester";p["password"]="synthetic-parser-fixture";if(present)p["rememberUntilDayEnd"]=flag;return new JavaScriptSerializer().Serialize(p);}
  static void Reject(string json,int status,string code)
  {
   try{AuthHandler.ParseCredentials(json);}catch(Exception e){FieldInfo s=e.GetType().GetField("Status"),c=e.GetType().GetField("Code");Check(s!=null&&c!=null&&(int)s.GetValue(e)==status&&(string)c.GetValue(e)==code,"Wrong parser rejection");return;}
   throw new Exception("Invalid credentials accepted");
  }
  static HttpContext Context(){return new HttpContext(new HttpRequest("","https://localhost/WebVault/",""),new HttpResponse(new StringWriter()));}
  static void Cookie(HttpContext c,string name,string value,bool remove,DateTime? expiry)
  {MethodInfo m=typeof(AuthHandler).GetMethod("SetCookie",BindingFlags.NonPublic|BindingFlags.Static);Check(m!=null,"Cookie writer missing");try{m.Invoke(null,new object[]{c,name,value,remove,expiry});}catch(TargetInvocationException e){throw e.InnerException;}}
  public static int Run()
  {
   int passed=0;
   AuthHandler.Credentials legacy=AuthHandler.ParseCredentials("{\"login\":\" tester \",\"password\":\" test \"}");
   Check(legacy.login=="tester"&&legacy.password==" test "&&!legacy.rememberUntilDayEnd,"Legacy credentials changed");passed++;
   Check(AuthHandler.ParseCredentials(Body(true)).rememberUntilDayEnd,"True flag rejected");passed++;
   Check(!AuthHandler.ParseCredentials(Body(false)).rememberUntilDayEnd&&!AuthHandler.ParseCredentials(Body(null,false)).rememberUntilDayEnd,"False/default changed");passed++;
   foreach(object v in new object[]{null,"true","false",0,1,1.0,new object[0],new Dictionary<string,object>()})Reject(Body(v),400,"invalid_remember_until_day_end");passed++;
   foreach(string invalid in new[]{"null","[]","{"})Reject(invalid,400,"invalid_json");passed++;
   Reject(new string(' ',4097),413,"request_too_large");passed++;
   Reject("{\"login\":\"../vault\",\"password\":\"test\"}",400,"invalid_credentials_format");
   Reject("{\"login\":\"tester\",\"password\":\"\"}",400,"invalid_credentials_format");
   Reject(new JavaScriptSerializer().Serialize(new{login="tester",password=new string('x',129)}),400,"invalid_credentials_format");passed++;
   HttpContext normal=Context();Cookie(normal,"WebVaultSession","normal",false,null);Check(normal.Response.Cookies["WebVaultSession"].Expires==DateTime.MinValue,"Normal cookie became persistent");passed++;
   DateTime deadline=new DateTime(2026,11,1,21,0,0,DateTimeKind.Utc);HttpContext day=Context();
   Cookie(day,"WebVaultSession","session-test",false,deadline);Cookie(day,"WebVaultCsrf","csrf-test",false,deadline);
   foreach(string name in new[]{"WebVaultSession","WebVaultCsrf"}){HttpCookie c=day.Response.Cookies[name];Check(c.Expires.ToUniversalTime()==deadline&&c.HttpOnly&&c.Secure==day.Request.IsSecureConnection&&c.Path==(String.IsNullOrEmpty(day.Request.ApplicationPath)?"/":day.Request.ApplicationPath),"Remembered cookie incorrect");}passed++;
   HttpContext removed=Context();Cookie(removed,"WebVaultSession","",true,deadline);Check(removed.Response.Cookies["WebVaultSession"].Expires.ToUniversalTime()<DateTime.UtcNow,"Removal failed to expire cookie");passed++;
   AuthHandler.Credentials input=AuthHandler.ParseCredentials(Body(true));SessionLifetime.Plan p=SessionLifetime.Create(Now,input.rememberUntilDayEnd,false,false);
   HttpContext composed=Context();Cookie(composed,"WebVaultSession","fixture",false,SessionLifetime.CookieExpiry(p.AbsoluteExpiresUtc,p.RememberUntilDayEnd));Check(p.RememberUntilDayEnd&&p.ExpiresUtc==deadline&&composed.Response.Cookies["WebVaultSession"].Expires.ToUniversalTime()==deadline,"Parser/policy/cookie composition failed");passed++;
   foreach(bool required in new[]{false,true}){SessionLifetime.Plan restricted=SessionLifetime.Create(Now,input.rememberUntilDayEnd,!required,required);Check(!restricted.RememberUntilDayEnd&&restricted.ExpiresUtc==Now.AddMinutes(30)&&restricted.AbsoluteExpiresUtc==Now.AddHours(8)&&!SessionLifetime.CookieExpiry(restricted.AbsoluteExpiresUtc,restricted.RememberUntilDayEnd).HasValue,"Restricted role received remembered mode");}passed++;
   return passed;
  }
 }
}
'@
    $testFile = Join-Path $temp 'Harness.cs'
    $assemblyPath = Join-Path $temp 'WebVault.SessionLoginChecks.dll'
    [System.IO.File]::WriteAllText($testFile,$harness,[System.Text.Encoding]::UTF8)
    $compilerArgs = @('/nologo','/target:library',('/out:' + $assemblyPath)) + $references + $sources + @($testFile)
    & $csc @compilerArgs
    if ($LASTEXITCODE -ne 0) { throw "Ошибка компиляции App_Code; код $LASTEXITCODE" }
    if (-not (Test-Path -LiteralPath $assemblyPath -PathType Leaf)) { throw 'Компилятор не создал тестовую сборку' }
    $assembly = [Reflection.Assembly]::Load([System.IO.File]::ReadAllBytes($assemblyPath))
    $count = $assembly.GetType('WebVaultSessionLoginTests.Harness',$true).GetMethod('Run').Invoke($null,$null)
    if ($count -ne 12) { throw "Неожиданное число групп: $count" }
    Write-Output ("PASS: {0}/12 session-login groups; App_Code compiled; CLR {1}; no SQL/IIS" -f $count,[Environment]::Version)
} finally {
    Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
}
