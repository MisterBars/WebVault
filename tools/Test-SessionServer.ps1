<#
.SYNOPSIS
Компиляция текущего App_Code и проверка записи cookies без SQL/IIS.
Не проверяет SQL-запросы me, вход или настоящую смену пароля.
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
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ('WVSessionServer-' + [Guid]::NewGuid().ToString('N'))
[void][System.IO.Directory]::CreateDirectory($temp)
try {
    $harness = @'
using System;
using System.IO;
using System.Reflection;
using System.Web;
using WebVault;
namespace WebVaultSessionServerTests
{
 public static class Harness
 {
  static readonly DateTime Deadline=new DateTime(2026,11,2,21,0,0,DateTimeKind.Utc);
  static void Check(bool value,string message){if(!value)throw new Exception(message);}
  static HttpContext Context(){return new HttpContext(new HttpRequest("","https://localhost/WebVault/",""),new HttpResponse(new StringWriter()));}
  static ApiUser User(bool remembered){return new ApiUser{UserId=7,SessionId=123,RememberUntilDayEnd=remembered,AbsoluteExpiresUtc=Deadline};}
  static void Set(HttpContext c,ApiUser u,string token,string csrf)
  {
   MethodInfo method=typeof(AccountHandler).GetMethod("SetCookies",BindingFlags.NonPublic|BindingFlags.Static);
   Check(method!=null,"Cookie setter missing");
   try{method.Invoke(null,new object[]{c,token,csrf,u});}catch(TargetInvocationException e){throw e.InnerException;}
  }
  static void Rejected(ApiUser user)
  {
   try{Set(Context(),user,"test-token","test-csrf");}catch(ApiFailure e){Check(e.Status==401&&e.Code=="unauthenticated","Wrong rejection");return;}
   throw new Exception("Invalid remembered session accepted");
  }
  public static int Run()
  {
   int passed=0;HttpContext c=Context();ApiUser user=User(true);Set(c,user,"token-one","csrf-one");
   Check(c.Response.Cookies.Count==2&&c.Response.Cookies["WebVaultSession"].Expires.ToUniversalTime()==Deadline&&c.Response.Cookies["WebVaultCsrf"].Expires.ToUniversalTime()==Deadline,"Remembered cookie deadline incorrect");passed++;
   HttpContext normal=Context();Set(normal,User(false),"token-normal","csrf-normal");
   Check(normal.Response.Cookies["WebVaultSession"].Expires==DateTime.MinValue&&normal.Response.Cookies["WebVaultCsrf"].Expires==DateTime.MinValue,"Normal cookies became persistent");passed++;
   string path=String.IsNullOrEmpty(c.Request.ApplicationPath)?"/":c.Request.ApplicationPath;
   foreach(string name in new[]{"WebVaultSession","WebVaultCsrf"}){HttpCookie cookie=c.Response.Cookies[name];Check(cookie.HttpOnly&&cookie.Secure==c.Request.IsSecureConnection&&cookie.Path==path,"Cookie flags/path changed");}passed++;
   Set(c,user,"token-two","csrf-two");
   Check(c.Response.Cookies["WebVaultSession"].Value=="token-two"&&c.Response.Cookies["WebVaultCsrf"].Value=="csrf-two"&&c.Response.Cookies["WebVaultSession"].Expires.ToUniversalTime()==Deadline,"Token replacement moved expiry");passed++;
   Check(user.UserId==7&&user.SessionId==123&&user.AbsoluteExpiresUtc==Deadline&&user.RememberUntilDayEnd,"Cookie setter mutated session identity");passed++;
   ApiUser admin=User(true);admin.IsAdmin=true;Rejected(admin);passed++;
   ApiUser temporary=User(true);temporary.MustChangePassword=true;Rejected(temporary);passed++;
   ApiUser invalid=User(true);invalid.AbsoluteExpiresUtc=DateTime.SpecifyKind(Deadline,DateTimeKind.Unspecified);
   bool utcRejected=false;try{Set(Context(),invalid,"token","csrf");}catch(ArgumentException){utcRejected=true;}Check(utcRejected,"Non-UTC expiry accepted");passed++;
   bool anonymousRejected=false;try{WebApi.RequireUser(Context(),false,true);}catch(ApiFailure e){Check(e.Status==401&&e.Code=="unauthenticated","Wrong anonymous rejection");anonymousRejected=true;}Check(anonymousRejected,"Anonymous call accepted");passed++;
   return passed;
  }
 }
}
'@
    $testFile = Join-Path $temp 'Harness.cs'
    $assemblyPath = Join-Path $temp 'WebVault.SessionServerChecks.dll'
    [System.IO.File]::WriteAllText($testFile,$harness,[System.Text.Encoding]::UTF8)
    $compilerArgs = @('/nologo','/target:library',('/out:' + $assemblyPath)) + $references + $sources + @($testFile)
    & $csc @compilerArgs
    if ($LASTEXITCODE -ne 0) { throw "Ошибка компиляции App_Code; код $LASTEXITCODE" }
    if (-not (Test-Path -LiteralPath $assemblyPath -PathType Leaf)) { throw 'Компилятор не создал тестовую сборку' }
    $assembly = [Reflection.Assembly]::Load([System.IO.File]::ReadAllBytes($assemblyPath))
    $count = $assembly.GetType('WebVaultSessionServerTests.Harness',$true).GetMethod('Run').Invoke($null,$null)
    if ($count -ne 9) { throw "Неожиданное число групп: $count" }
    Write-Output ("PASS: {0}/9 session-server groups; App_Code compiled; CLR {1}; no SQL/IIS" -f $count,[Environment]::Version)
} finally {
    Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
}
