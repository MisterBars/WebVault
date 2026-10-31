<#
.SYNOPSIS
Проверка привязанных файловых каталогов и адресной очистки без HTTP/IIS.
#>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
$repo = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
$imports = 'using System; using System.IO; using System.Diagnostics; using System.Globalization; using System.Text; using System.Text.RegularExpressions; using System.Security.Cryptography;'
$parts = @()
foreach ($name in @('BenchmarkFileCycle.cs','BenchmarkRunJournal.cs','BenchmarkRunStep.cs')) {
    $text = [System.IO.File]::ReadAllText((Join-Path $repo ('src\WebVault.Web\App_Code\' + $name)))
    $parts += [regex]::Replace($text, '(?m)^using [^\r\n]+;\r?\n', '')
}
$harness = @'
namespace WebVaultBindingTests
{
    using System;
    using System.IO;
    using System.Text;
    using WebVault;
    public static class Harness
    {
        static void Check(bool v, string message) { if (!v) throw new Exception(message); }
        static void Expect(Action call, string code)
        {
            try { call(); } catch (InvalidOperationException e) { Check(e.Message == code, "Неожиданная ошибка: " + e.Message); return; }
            throw new Exception("Не получена ошибка: " + code);
        }
        sealed class Case
        {
            public string Root, Journal;
            public BenchmarkRunJournal.Identity Id;
            public int Calls;
            public Func<DateTime> Clock = delegate { return new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc); };
            public Case(string root, string name)
            {
                Root = Path.Combine(root, name); Check(Root.Length <= 100, "Слишком длинный тестовый корень"); Directory.CreateDirectory(Root);
                Directory.CreateDirectory(Path.Combine(Root,"vaults")); Directory.CreateDirectory(Path.Combine(Root,"history"));
                File.WriteAllText(Path.Combine(Root,"vaults","keep.md"),"vault"); File.WriteAllText(Path.Combine(Root,"history","keep.md"),"history");
                BenchmarkFileCycle.Execute(Root,1,1,delegate { });
                Id = new BenchmarkRunJournal.Identity(7,11,Guid.NewGuid(),Guid.NewGuid(),Guid.NewGuid());
                Journal = Path.Combine(Root,"Bench",Id.Run.ToString("N")); Directory.CreateDirectory(Journal);
                BenchmarkRunJournal.Initialize(Journal,Id,2,1,2,Clock,delegate { });
            }
            public string Payload(int index) { return Path.Combine(Root,"Bench",BenchmarkFileCycle.BoundId(Id.Run,index)); }
            public BenchmarkRunJournal.Snapshot State() { return BenchmarkRunJournal.Read(Journal,Id,delegate { }); }
            public BenchmarkFileCycle.Result Step(int index)
            {
                return BenchmarkRunStep.Execute(Journal,Id,index,Clock,delegate { },delegate(BenchmarkRunJournal.Snapshot s,Action guard) {
                    Calls++; return BenchmarkFileCycle.ExecuteBound(Root,Id.Run,index,s.Actors,s.SizeKiB,guard);
                });
            }
            public string Residue(int index)
            {
                string dir = Payload(index); Directory.CreateDirectory(dir);
                string marker = "WebVault Bench cycle v1|" + BenchmarkFileCycle.BoundId(Id.Run,index) + "|2\n";
                File.WriteAllText(Path.Combine(dir,"owner.txt"),marker,new UTF8Encoding(false));
                string actor = Path.Combine(dir,"vaults","actor-0001"); Directory.CreateDirectory(actor);
                File.WriteAllText(Path.Combine(actor,"note.md"),"residue"); return dir;
            }
            public void Clean(int index)
            {
                BenchmarkRunStep.StopAndConfirm(Journal,Id,delegate { },delegate {
                    for (int i = 0; i < 2; i++) {
                        BenchmarkFileCycle.RecoverBound(Root,Id.Run,i,2,delegate { });
                        Check(!Directory.Exists(Payload(i)) && !File.Exists(Payload(i)),"Файлы не очищены");
                    }
                });
            }
            public void Sentinels()
            {
                Check(File.ReadAllText(Path.Combine(Root,"vaults","keep.md")) == "vault","Изменены личные файлы");
                Check(File.ReadAllText(Path.Combine(Root,"history","keep.md")) == "history","Изменена история");
                Check(File.Exists(Path.Combine(Journal,"journal.bin")),"Удалён журнал");
            }
        }
        public static int Run(string root)
        {
            int passed = 0; Guid fixedRun = new Guid("11111111-1111-1111-1111-111111111111");
            string bound = BenchmarkFileCycle.BoundId(fixedRun,0);
            Check(bound == "f539f58a4675e3c679e3ff8f903a9fde" && bound == BenchmarkFileCycle.BoundId(fixedRun,0),"Изменён формат привязки версии1");
            Check(bound != BenchmarkFileCycle.BoundId(fixedRun,1) && bound != BenchmarkFileCycle.BoundId(Guid.NewGuid(),0),"Коллизия тестовых привязок"); passed++;
            Case c = new Case(root,"ok"); BenchmarkFileCycle.Result r = c.Step(0);
            Check(r.RunId == BenchmarkFileCycle.BoundId(c.Id.Run,0) && r.CleanupConfirmed,"Неверный ID файлов шага");
            c.Step(1); Check(c.State().Next == 2 && !Directory.Exists(c.Payload(0)) && !Directory.Exists(c.Payload(1)),"Не завершены привязанные шаги"); c.Sentinels(); passed++;
            Expect(delegate { c.Step(0); },"benchmark_sequence_mismatch"); Check(c.Calls == 2,"Повторена файловая операция"); passed++;
            c = new Case(root,"recover"); string dir = c.Residue(0); BenchmarkRunJournal.Begin(c.Journal,c.Id,0,c.Clock,delegate { });
            Check(c.State().Phase == 1,"Не сохранён незавершённый шаг"); c.Clean(0);
            Check(c.State().Phase == 2 && c.State().CleanupConfirmed && !Directory.Exists(dir),"Не подтверждена адресная очистка"); c.Sentinels(); passed++;
            c = new Case(root,"foreign"); dir = c.Residue(0); bool called = false;
            BenchmarkRunJournal.Identity foreign = new BenchmarkRunJournal.Identity(8,c.Id.Session,c.Id.Grant,c.Id.Request,c.Id.Run);
            Expect(delegate { BenchmarkRunStep.StopAndConfirm(c.Journal,foreign,delegate { },delegate { called = true; }); },"benchmark_run_not_found");
            Check(!called && File.Exists(Path.Combine(dir,"owner.txt")),"Чужая очистка вызвана"); c.Sentinels(); passed++;
            c = new Case(root,"unknown"); dir = c.Residue(0); string unknown = Path.Combine(dir,"keep.txt"); File.WriteAllText(unknown,"keep");
            Expect(delegate { c.Clean(0); },"benchmark_cleanup_unconfirmed");
            Check(!c.State().CleanupConfirmed && File.ReadAllText(unknown) == "keep","Неизвестный объект удалён или принят"); c.Sentinels(); passed++;
            c = new Case(root,"marker"); dir = c.Residue(0); string owner = Path.Combine(dir,"owner.txt"); File.WriteAllText(owner,"foreign");
            Expect(delegate { c.Clean(0); },"benchmark_content_mismatch");
            Check(File.ReadAllText(owner) == "foreign" && !c.State().CleanupConfirmed,"Неверный маркер принят"); c.Sentinels(); passed++;
            c = new Case(root,"collision"); dir = c.Residue(0);
            Expect(delegate { c.Step(0); },"benchmark_collision");
            Check(c.State().Phase == 1 && c.State().Next == 0 && File.ReadAllText(Path.Combine(dir,"vaults","actor-0001","note.md")) == "residue","Остаток перезаписан"); c.Sentinels(); passed++;
            c = new Case(root,"scope"); string zero = c.Residue(0), one = c.Residue(1);
            Expect(delegate { BenchmarkRunStep.StopAndConfirm(c.Journal,c.Id,delegate { },delegate { BenchmarkFileCycle.RecoverBound(c.Root,c.Id.Run,0,2,delegate { }); if (Directory.Exists(one)) throw new InvalidOperationException("payload_present"); }); },"payload_present");
            Check(!Directory.Exists(zero) && Directory.Exists(one) && !c.State().CleanupConfirmed,"Очистка затронула другой шаг или ложно подтверждена"); c.Sentinels(); passed++;
            c = new Case(root,"denied"); dir = c.Residue(0);
            Expect(delegate { BenchmarkFileCycle.RecoverBound(c.Root,c.Id.Run,0,2,delegate { throw new InvalidOperationException("denied"); }); },"denied");
            Check(File.ReadAllText(Path.Combine(dir,"vaults","actor-0001","note.md")) == "residue","Отказ авторизации изменил файлы"); c.Sentinels(); passed++;
            return passed;
        }
    }
}
'@
$testRoot = [System.IO.Path]::GetFullPath((Join-Path $repo ('.wvp-' + [Guid]::NewGuid().ToString('N'))))
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
    $count = [WebVaultBindingTests.Harness]::Run($testRoot)
    if ($count -ne 10) { throw "Неожиданное число групп: $count" }
    Write-Output ("PASS: {0}/10 bound-payload groups; CLR {1}" -f $count,[Environment]::Version)
} finally { Remove-TestTree $testRoot }
