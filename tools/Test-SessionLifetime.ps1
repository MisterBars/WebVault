<#
.SYNOPSIS
Проверка чистой политики сроков сессии без SQL, IIS, cookies и входа.
#>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
$repo = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
$source = Join-Path $repo 'src\WebVault.Web\App_Code\SessionLifetime.cs'
if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw 'Не найден SessionLifetime.cs' }
$csc = Join-Path ([System.Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()) 'csc.exe'
if (-not (Test-Path -LiteralPath $csc -PathType Leaf)) { throw 'Нужен Windows PowerShell с компилятором .NET Framework 4.x' }
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ('WVSessionLifetime-' + [Guid]::NewGuid().ToString('N'))
[void][System.IO.Directory]::CreateDirectory($temp)
try {
    $harness = @'
using System;
using System.Collections.Generic;
using WebVault;
namespace WebVaultSessionLifetimeTests
{
    public static class Harness
    {
        static DateTime Utc(int y,int m,int d,int h,int min=0,int sec=0,int ms=0)
        { return new DateTime(y,m,d,h,min,sec,ms,DateTimeKind.Utc); }
        static void Check(bool value,string message) { if (!value) throw new Exception(message); }
        static void Reject<T>(Action action) where T:Exception
        { try { action(); } catch (Exception e) { if (e is T) return; throw; } throw new Exception("Expected " + typeof(T).Name); }
        public static int Run()
        {
            int passed=0; DateTime now=Utc(2026,11,1,10);
            SessionLifetime.Plan normal=SessionLifetime.Create(now,false,false,false);
            Check(!normal.RememberUntilDayEnd && normal.ExpiresUtc==now.AddMinutes(30) && normal.AbsoluteExpiresUtc==now.AddHours(8),"Normal mode changed"); passed++;
            SessionLifetime.Plan day=SessionLifetime.Create(now,true,false,false); DateTime midnight=Utc(2026,11,1,21);
            Check(day.RememberUntilDayEnd && day.ExpiresUtc==midnight && day.AbsoluteExpiresUtc==midnight && day.AbsoluteExpiresUtc.Kind==DateTimeKind.Utc,"MSK midnight incorrect"); passed++;
            Check(SessionLifetime.Create(Utc(2026,11,1,20,59,59,999),true,false,false).ExpiresUtc==midnight,"Last millisecond incorrect"); passed++;
            Check(SessionLifetime.Create(midnight,true,false,false).ExpiresUtc==Utc(2026,11,2,21),"Login at midnight incorrect"); passed++;
            Check(SessionLifetime.Create(Utc(2028,2,29,20),true,false,false).ExpiresUtc==Utc(2028,2,29,21),"Leap day incorrect"); passed++;
            Check(SessionLifetime.Create(Utc(2026,12,31,22),true,false,false).ExpiresUtc==Utc(2027,1,1,21),"Year boundary incorrect"); passed++;
            SessionLifetime.Plan admin=SessionLifetime.Create(now,true,true,false);
            Check(!admin.RememberUntilDayEnd && admin.AbsoluteExpiresUtc==now.AddHours(8),"Admin received remembered mode"); passed++;
            SessionLifetime.Plan temporary=SessionLifetime.Create(now,true,false,true);
            Check(!temporary.RememberUntilDayEnd && temporary.ExpiresUtc==now.AddMinutes(30),"Temporary-password session received remembered mode"); passed++;
            Check(SessionLifetime.Renew(now,normal.AbsoluteExpiresUtc,false)==now.AddMinutes(30),"Normal renewal incorrect"); passed++;
            Check(SessionLifetime.Renew(Utc(2026,11,1,17,50),normal.AbsoluteExpiresUtc,false)==normal.AbsoluteExpiresUtc,"Renewal exceeded absolute limit"); passed++;
            Check(SessionLifetime.Renew(Utc(2026,11,1,20,58),day.AbsoluteExpiresUtc,true)==midnight,"Remembered renewal moved midnight"); passed++;
            Reject<InvalidOperationException>(delegate { SessionLifetime.Renew(midnight,midnight,true); });
            Reject<InvalidOperationException>(delegate { SessionLifetime.Renew(midnight.AddMilliseconds(1),midnight,false); }); passed++;
            Reject<ArgumentException>(delegate { SessionLifetime.Create(DateTime.SpecifyKind(now,DateTimeKind.Unspecified),true,false,false); });
            Reject<ArgumentException>(delegate { SessionLifetime.Renew(now,DateTime.SpecifyKind(midnight,DateTimeKind.Local),true); });
            Reject<ArgumentException>(delegate { SessionLifetime.CookieExpiry(DateTime.SpecifyKind(midnight,DateTimeKind.Unspecified),true); }); passed++;
            Dictionary<string,object> p=new Dictionary<string,object>();Check(!SessionLifetime.ReadRememberFlag(p),"Missing flag changed default");
            p["rememberUntilDayEnd"]=true;Check(SessionLifetime.ReadRememberFlag(p),"Boolean true rejected");p["rememberUntilDayEnd"]=false;Check(!SessionLifetime.ReadRememberFlag(p),"Boolean false changed"); passed++;
            foreach (object value in new object[] {null,0,1,"true","false",1.0,new object[0]})
            { Dictionary<string,object> q=new Dictionary<string,object>();q["rememberUntilDayEnd"]=value;Reject<ArgumentException>(delegate { SessionLifetime.ReadRememberFlag(q); }); } passed++;
            Check(SessionLifetime.CookieExpiry(day.AbsoluteExpiresUtc,true).Value==midnight && !SessionLifetime.CookieExpiry(normal.AbsoluteExpiresUtc,false).HasValue,"Cookie expiry selection incorrect");
            DateTime renewed=SessionLifetime.Renew(Utc(2026,11,1,20,59),midnight,true);
            Check(SessionLifetime.CookieExpiry(renewed,true).Value==midnight,"Expiry selection moved original deadline"); passed++;
            return passed;
        }
    }
}
'@
    $testFile = Join-Path $temp 'Harness.cs'
    $assemblyPath = Join-Path $temp 'WebVault.SessionLifetimeChecks.dll'
    [System.IO.File]::WriteAllText($testFile,$harness,[System.Text.Encoding]::UTF8)
    $compilerArgs = @('/nologo','/target:library',('/out:' + $assemblyPath),$source,$testFile)
    & $csc @compilerArgs
    if ($LASTEXITCODE -ne 0) { throw "Ошибка компиляции политики сессии; код $LASTEXITCODE" }
    if (-not (Test-Path -LiteralPath $assemblyPath -PathType Leaf)) { throw 'Компилятор не создал тестовую сборку' }
    $assembly = [Reflection.Assembly]::Load([System.IO.File]::ReadAllBytes($assemblyPath))
    $count = $assembly.GetType('WebVaultSessionLifetimeTests.Harness',$true).GetMethod('Run').Invoke($null,$null)
    if ($count -ne 16) { throw "Неожиданное число групп: $count" }
    Write-Output ("PASS: {0}/16 session-lifetime groups; CLR {1}; no SQL/IIS" -f $count,[Environment]::Version)
} finally {
    Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
}
