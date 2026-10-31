<#
.SYNOPSIS
Компиляция App_Code и проверка формата файлового HTTP-протокола без SQL/IIS.
#>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
$repo = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
$route = [System.IO.File]::ReadAllText((Join-Path $repo 'src\WebVault.Web\api\benchmark_files.ashx'))
if ($route.Trim() -ne '<%@ WebHandler Language="C#" Class="WebVault.BenchmarkFilesHandler" %>') { throw 'Неверная привязка HTTP-обработчика' }
# Компилируются исходные файлы целиком, каждый со своими using, атрибутами и областью имён.
$sources = @(Get-ChildItem (Join-Path $repo 'src\WebVault.Web\App_Code') -Filter '*.cs' | Sort-Object Name | ForEach-Object { $_.FullName })
if ($sources.Count -eq 0) { throw 'Исходники App_Code не найдены; остановка' }
$framework = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$csc = Join-Path $framework 'csc.exe'
if (-not (Test-Path -LiteralPath $csc -PathType Leaf)) {
    $framework = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319'
    $csc = Join-Path $framework 'csc.exe'
}
if (-not (Test-Path -LiteralPath $csc -PathType Leaf)) { throw 'Не найден штатный компилятор .NET Framework csc.exe; остановка' }
$references = @('System.dll','System.Core.dll','System.Configuration.dll','System.Data.dll','System.Web.dll','System.Web.Extensions.dll') | ForEach-Object { '/reference:' + (Join-Path $framework $_) }
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ('WVBenchProtocol-' + [Guid]::NewGuid().ToString('N'))
[void][System.IO.Directory]::CreateDirectory($temp)
$serverAssembly = Join-Path $temp 'WebVault.ProtocolServer.dll'
$testAssemblyPath = Join-Path $temp 'WebVault.ProtocolChecks.dll'
try {
    $serverArgs = @('/nologo', '/target:library', ('/out:' + $serverAssembly)) + $references + $sources
    & $csc @serverArgs
    if ($LASTEXITCODE -ne 0) { throw "csc.exe не собрал App_Code; код $LASTEXITCODE. Проверки не запускались" }
    if (-not (Test-Path -LiteralPath $serverAssembly -PathType Leaf)) { throw 'csc.exe не создал сборку App_Code; остановка' }
    $harness = @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Web;
using System.Web.Caching;
using System.Web.Script.Serialization;
using WebVault;
public static class WebVaultFilesProtocolChecks
{
    static readonly string Request = new string('a',32);
    static Dictionary<string,object> Input(string action) { return new Dictionary<string,object> { {"action",action},{"requestId",Request} }; }
    static Dictionary<string,object> Start() { Dictionary<string,object> p = Input("start"); p["actors"] = 2; p["sizeKiB"] = 1; p["count"] = 2; return p; }
    static void Check(bool v,string message) { if (!v) throw new Exception(message); }
    static void Reject(Dictionary<string,object> p,string code)
    { try { BenchmarkFilesHandler.Parse(p); } catch (ApiFailure e) { Check(e.Status == 400 && e.Code == code,"Неверный отказ: " + e.Code); return; } throw new Exception("Не отклонён неверный запрос: " + code); }
    static void Mapped(Exception e,int status,string code)
    { ApiFailure f = BenchmarkFilesHandler.MapError(e) as ApiFailure; Check(f != null && f.Status == status && f.Code == code,"Неверное сопоставление ошибки"); }
    public static int Run()
    {
        int passed = 0;
        Check(typeof(SemaphoreSlim) == typeof(System.Threading.SemaphoreSlim) && typeof(Cache) == typeof(System.Web.Caching.Cache),"Потеряны пространства имён серверных типов");
        Check(typeof(DllImportAttribute) == typeof(System.Runtime.InteropServices.DllImportAttribute) && typeof(CharSet) == typeof(System.Runtime.InteropServices.CharSet),"Не разрешены типы атрибутов P/Invoke");
        BenchmarkFilesHandler.Command c = BenchmarkFilesHandler.Parse(Start());
        Check(c.Action == "start" && c.Request.ToString("N") == Request && c.Actors == 2 && c.SizeKiB == 1 && c.Count == 2,"Неверные параметры начала"); passed++;
        foreach (string action in new[] {"status","cancel"}) Check(BenchmarkFilesHandler.Parse(Input(action)).Action == action,"Неверное действие");
        Dictionary<string,object> step = Input("step"); step["index"] = 12; Check(BenchmarkFilesHandler.Parse(step).Index == 12,"Неверный индекс"); passed++;
        Reject(null,"invalid_json"); Reject(new Dictionary<string,object>(),"invalid_parameter"); Reject(Input("grant"),"invalid_action"); passed++;
        foreach (string key in new[] {"userId","sessionId","grant","path","url","sql","runId","text"}) { Dictionary<string,object> q = Start(); q[key] = "forbidden"; Reject(q,"unknown_parameter"); } passed++;
        foreach (object value in new object[] {null,true,new string('0',32),Request.ToUpperInvariant(),"../vaults","not-guid"}) { Dictionary<string,object> q = Input("status"); q["requestId"] = value; Reject(q,"invalid_request_id"); } passed++;
        foreach (string key in new[] {"actors","sizeKiB","count"}) foreach (object value in new object[] {"1",true,1.0}) { Dictionary<string,object> q = Start(); q[key] = value; Reject(q,"invalid_parameter"); } passed++;
        foreach (int value in new[] {0,9}) { Dictionary<string,object> q = Start(); q["actors"] = value; Reject(q,"invalid_parameter"); }
        foreach (int value in new[] {0,65}) { Dictionary<string,object> q = Start(); q["sizeKiB"] = value; Reject(q,"invalid_parameter"); }
        foreach (int value in new[] {0,14}) { Dictionary<string,object> q = Start(); q["count"] = value; Reject(q,"invalid_parameter"); } passed++;
        Reject(Input("step"),"invalid_parameter"); foreach (object value in new object[] {-1,13,"0"}) { Dictionary<string,object> q = Input("step"); q["index"] = value; Reject(q,"invalid_parameter"); } passed++;
        Check(!BenchmarkFilesHandler.FlagEnabled(null) && !BenchmarkFilesHandler.FlagEnabled("false") && !BenchmarkFilesHandler.FlagEnabled("1") && !BenchmarkFilesHandler.FlagEnabled("true ") && BenchmarkFilesHandler.FlagEnabled("true") && BenchmarkFilesHandler.FlagEnabled("TRUE"),"Флаг включения ослаблен"); passed++;
        JavaScriptSerializer json = new JavaScriptSerializer(); Guid request = new Guid(Request);
        string absent = json.Serialize(BenchmarkFilesHandler.StateReply(null,request)); Check(absent.Contains("\"found\":false") && absent.Contains("\"state\":\"absent\""),"Не обозначено отсутствие запуска");
        BenchmarkRunCatalog.Entry entry = new BenchmarkRunCatalog.Entry { DirectoryPath = "C:\\SECRET_PATH", Identity = new BenchmarkRunJournal.Identity(7,11,Guid.NewGuid(),request,Guid.NewGuid()), State = new BenchmarkRunJournal.Snapshot { Actors = 2, SizeKiB = 1, Count = 2, Next = 1, Phase = 0, ExpiresUtcTicks = DateTime.UtcNow.AddSeconds(120).Ticks } };
        string state = json.Serialize(BenchmarkFilesHandler.StateReply(entry,request));
        Check(state.Contains("\"bytes\":1024") && state.Contains("\"next\":1") && !state.Contains("SECRET_PATH") && !state.Contains("DirectoryPath") && !state.Contains("Session") && !state.Contains("Grant") && !state.Contains("Owner"),"В ответ попали служебные данные"); passed++;
        Mapped(new InvalidOperationException("benchmark_capacity"),429,"benchmark_capacity"); Mapped(new InvalidOperationException("benchmark_run_not_found"),404,"benchmark_run_not_found");
        Mapped(new InvalidOperationException("benchmark_cleanup_unconfirmed",new ApiFailure(403,"benchmark_permission_changed")),409,"benchmark_cleanup_unconfirmed"); Mapped(new InvalidOperationException("benchmark_cycle_failed",new ApiFailure(403,"benchmark_permission_changed")),403,"benchmark_permission_changed"); passed++;
        Mapped(new UnauthorizedAccessException("SECRET"),403,"benchmark_storage_denied"); Mapped(new IOException("SECRET",unchecked((int)0x80070020)),409,"benchmark_busy"); Mapped(new IOException("SECRET"),503,"benchmark_storage_uncertain"); passed++;
        StringWriter output = new StringWriter(); HttpContext context = new HttpContext(new HttpRequest("","http://localhost/",""),new HttpResponse(output));
        WebApi.Error(context,BenchmarkFilesHandler.MapError(new Exception("SECRET C:/private/file")));
        Check(context.Response.StatusCode == 500 && output.ToString().Contains("server_error") && !output.ToString().Contains("SECRET") && !output.ToString().Contains("private"),"Ошибка раскрыла внутреннее сообщение"); passed++;
        return passed;
    }
}
'@
    $harnessFile = Join-Path $temp 'WebVaultFilesProtocolChecks.cs'
    [System.IO.File]::WriteAllText($harnessFile,$harness,[System.Text.Encoding]::UTF8)
    $testArgs = @(
    '/nologo'
    '/target:library'
    ('/out:' + $testAssemblyPath)
    ('/reference:' + $serverAssembly)
) + $references + @($harnessFile)
    & $csc @testArgs
    if ($LASTEXITCODE -ne 0) { throw "csc.exe не собрал тестовую обвязку; код $LASTEXITCODE" }
    if (-not (Test-Path -LiteralPath $testAssemblyPath -PathType Leaf)) { throw 'csc.exe не создал тестовую сборку; остановка' }
    foreach ($file in @($serverAssembly,$testAssemblyPath)) { [void][Reflection.Assembly]::Load([System.IO.File]::ReadAllBytes($file)) }
    $type = [Reflection.Assembly]::Load([System.IO.File]::ReadAllBytes($testAssemblyPath)).GetType('WebVaultFilesProtocolChecks',$true)
    $count = $type.GetMethod('Run').Invoke($null,$null)
    if ($count -ne 13) { throw "Неожиданное число групп: $count" }
    Write-Output ("PASS: {0}/13 files-protocol groups; App_Code compiled; CLR {1}" -f $count,[Environment]::Version)
} finally {
    Remove-Item -LiteralPath $temp -Recurse -Force -ErrorAction SilentlyContinue
}
