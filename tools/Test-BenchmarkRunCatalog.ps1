<#
.SYNOPSIS
Windows-проверка поиска запросов и квот каталога запусков без HTTP/IIS.
#>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
$repo = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
$imports = 'using System; using System.Collections.Generic; using System.Globalization; using System.IO; using System.Security.Cryptography; using System.Text; using System.Text.RegularExpressions;'
$parts = @()
foreach ($name in @('BenchmarkRunJournal.cs','BenchmarkRunCatalog.cs')) {
    $text = [System.IO.File]::ReadAllText((Join-Path $repo ('src\WebVault.Web\App_Code\' + $name)))
    $parts += [regex]::Replace($text,'(?m)^using [^\r\n]+;\r?\n','')
}
$harness = @'
namespace WebVaultCatalogTests
{
    using System;
    using System.IO;
    using WebVault;
    public static class Harness
    {
        static void Check(bool v,string message) { if (!v) throw new Exception(message); }
        static void Expect(Action call,string code) {
            try { call(); } catch (InvalidOperationException e) { Check(e.Message == code,"Неожиданная ошибка: " + e.Message); return; }
            throw new Exception("Не получена ошибка: " + code);
        }
        static string Data(string root,string name) { string d = Path.Combine(root,name); Check(d.Length <= 100,"Длинный тестовый корень"); Directory.CreateDirectory(d); return d; }
        public static int Run(string root)
        {
            int passed = 0; Guid request = Guid.NewGuid(),grant = Guid.NewGuid(); DateTime now = new DateTime(2026,1,1,0,0,0,DateTimeKind.Utc);
            Func<DateTime> clock = delegate { return now; }; Action auth = delegate { };
            string d = Data(root,"lookup");
            Check(BenchmarkRunCatalog.Find(d,7,11,request,auth) == null && !Directory.Exists(Path.Combine(d,"Bench")),"Поиск создал Bench"); passed++;
            BenchmarkRunCatalog.Entry first = BenchmarkRunCatalog.Start(d,7,11,grant,request,2,1,2,clock,auth);
            BenchmarkRunCatalog.Entry found = BenchmarkRunCatalog.Find(d,7,11,request,auth);
            Check(found != null && found.Identity.Run == first.Identity.Run && found.DirectoryPath == first.DirectoryPath,"Запуск не найден");
            BenchmarkRunJournal.Begin(first.DirectoryPath,first.Identity,0,clock,auth); long deadline = first.State.ExpiresUtcTicks; now = now.AddSeconds(20);
            found = BenchmarkRunCatalog.Start(d,7,11,grant,request,2,1,2,clock,auth);
            Check(found.State.Phase == 1 && found.State.Next == 0 && found.State.ExpiresUtcTicks == deadline && Directory.GetDirectories(Path.Combine(d,"Bench")).Length == 1,"Повтор начала сбросил запуск"); passed++;
            Expect(delegate { BenchmarkRunCatalog.Start(d,7,11,grant,request,2,2,2,clock,auth); },"benchmark_request_conflict");
            Check(BenchmarkRunCatalog.Find(d,7,11,request,auth).State.SizeKiB == 1,"Конфликт изменил параметры"); passed++;
            Check(BenchmarkRunCatalog.Find(d,8,11,request,auth) == null && BenchmarkRunCatalog.Find(d,7,12,request,auth) == null,"Чужой контекст нашёл запуск"); passed++;
            now = now.AddSeconds(121);
            Expect(delegate { BenchmarkRunCatalog.Start(d,7,11,grant,Guid.NewGuid(),2,1,2,clock,auth); },"benchmark_already_running");
            Check(BenchmarkRunCatalog.Find(d,7,11,request,auth).State.ExpiresUtcTicks == deadline,"Продлён старый срок"); passed++;
            BenchmarkRunJournal.Stop(first.DirectoryPath,first.Identity,auth);
            BenchmarkRunJournal.ConfirmCleanup(first.DirectoryPath,first.Identity,auth,delegate { });
            BenchmarkRunCatalog.Entry second = BenchmarkRunCatalog.Start(d,7,11,grant,Guid.NewGuid(),2,1,2,clock,auth);
            found = BenchmarkRunCatalog.Start(d,7,11,grant,request,2,1,2,clock,auth);
            Check(found.State.Phase == 2 && found.State.CleanupConfirmed && found.Identity.Run == first.Identity.Run && second.Identity.Run != first.Identity.Run,"Старый запрос оживил запуск"); passed++;
            Expect(delegate { BenchmarkRunCatalog.Start(d,7,11,Guid.NewGuid(),request,2,1,2,clock,auth); },"benchmark_request_conflict");
            Check(BenchmarkRunCatalog.Find(d,7,11,request,auth).Identity.Grant == grant,"Поколение старого запуска заменено"); passed++;
            d = Data(root,"logical"); Guid[] requests = new Guid[8];
            for (int i = 0; i < 8; i++) { requests[i] = Guid.NewGuid(); BenchmarkRunCatalog.Start(d,i+1,11,grant,requests[i],1,1,1,clock,auth); }
            Expect(delegate { BenchmarkRunCatalog.Start(d,9,11,grant,Guid.NewGuid(),1,1,1,clock,auth); },"benchmark_capacity");
            found = BenchmarkRunCatalog.Start(d,1,11,grant,requests[0],1,1,1,clock,auth);
            Check(found != null && Directory.GetDirectories(Path.Combine(d,"Bench")).Length == 8,"Квота нарушила повтор запроса"); passed++;
            d = Data(root,"physical"); request = Guid.NewGuid(); first = BenchmarkRunCatalog.Start(d,1,11,grant,request,1,1,1,clock,auth);
            BenchmarkRunJournal.Stop(first.DirectoryPath,first.Identity,auth); BenchmarkRunJournal.ConfirmCleanup(first.DirectoryPath,first.Identity,auth,delegate { });
            for (int i = 0; i < 30; i++) Directory.CreateDirectory(Path.Combine(d,"Bench",Guid.NewGuid().ToString("N")));
            Expect(delegate { BenchmarkRunCatalog.Start(d,2,11,grant,Guid.NewGuid(),1,1,1,clock,auth); },"benchmark_capacity");
            Check(BenchmarkRunCatalog.Start(d,1,11,grant,request,1,1,1,clock,auth).State.Phase == 2 && Directory.GetDirectories(Path.Combine(d,"Bench")).Length == 31,"Удалены остатки ради квоты"); passed++;
            d = Data(root,"corrupt"); request = Guid.NewGuid(); first = BenchmarkRunCatalog.Start(d,1,11,grant,request,1,1,1,clock,auth);
            string journal = Path.Combine(first.DirectoryPath,"journal.bin"); byte[] bytes = File.ReadAllBytes(journal); bytes[0] ^= 1; File.WriteAllBytes(journal,bytes);
            Expect(delegate { BenchmarkRunCatalog.Find(d,1,11,request,auth); },"benchmark_catalog_invalid");
            Expect(delegate { BenchmarkRunCatalog.Start(d,2,11,grant,Guid.NewGuid(),1,1,1,clock,auth); },"benchmark_catalog_invalid");
            Check(Directory.GetDirectories(Path.Combine(d,"Bench")).Length == 1,"Повреждение вызвало новый запуск"); passed++;
            d = Data(root,"unknown"); first = BenchmarkRunCatalog.Start(d,1,11,grant,Guid.NewGuid(),1,1,1,clock,auth); string keep = Path.Combine(d,"Bench","keep.txt"); File.WriteAllText(keep,"keep");
            Expect(delegate { BenchmarkRunCatalog.Start(d,2,11,grant,Guid.NewGuid(),1,1,1,clock,auth); },"benchmark_unknown_entry");
            Check(File.ReadAllText(keep) == "keep","Неизвестный объект изменён"); passed++;
            d = Data(root,"denied");
            Expect(delegate { BenchmarkRunCatalog.Start(d,1,11,grant,Guid.NewGuid(),1,1,1,clock,delegate { throw new InvalidOperationException("denied"); }); },"denied");
            Check(!Directory.Exists(Path.Combine(d,"Bench")),"Отказ полномочий создал Bench"); passed++;
            return passed;
        }
    }
}
'@
$testRoot = [System.IO.Path]::GetFullPath((Join-Path $repo ('.wvk-' + [Guid]::NewGuid().ToString('N'))))
if ($testRoot.Length + 12 -gt 100) { throw 'Путь рабочей копии слишком длинен; остановка' }
if ([System.IO.Directory]::Exists($testRoot) -or [System.IO.File]::Exists($testRoot)) { throw 'Конфликт тестового каталога; остановка' }
Add-Type -TypeDefinition ($imports + [Environment]::NewLine + ($parts -join [Environment]::NewLine) + [Environment]::NewLine + $harness) -Language CSharp -ErrorAction Stop
[void][System.IO.Directory]::CreateDirectory($testRoot)
function Remove-TestTree([string]$path) {
    $a = [System.IO.File]::GetAttributes($path)
    if (($a -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Отказ очистки тестового reparse point' }
    if (($a -band [System.IO.FileAttributes]::Directory) -ne 0) {
        foreach ($child in [System.IO.Directory]::GetFileSystemEntries($path)) { Remove-TestTree $child }
        [System.IO.Directory]::Delete($path,$false)
    } else { [System.IO.File]::Delete($path) }
}
try {
    $count = [WebVaultCatalogTests.Harness]::Run($testRoot)
    if ($count -ne 12) { throw "Неожиданное число групп: $count" }
    Write-Output ("PASS: {0}/12 run-catalog groups; CLR {1}" -f $count,[Environment]::Version)
} finally { Remove-TestTree $testRoot }
