<#
.SYNOPSIS
Совместная проверка журнала и файлового ядра на временных данных, без HTTP/IIS.
#>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
$repo = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
$imports = 'using System; using System.IO; using System.Diagnostics; using System.Globalization; using System.Text; using System.Text.RegularExpressions; using System.Security.Cryptography;'
$parts = @()
foreach ($name in @('BenchmarkFileCycle.cs', 'BenchmarkRunJournal.cs', 'BenchmarkRunStep.cs')) {
    $text = [System.IO.File]::ReadAllText((Join-Path $repo ('src\WebVault.Web\App_Code\' + $name)))
    $parts += [regex]::Replace($text, '(?m)^using [^\r\n]+;\r?\n', '')
}
$harness = @'
namespace WebVaultStepTests
{
    using System;
    using System.IO;
    using WebVault;
    public static class Harness
    {
        static void Check(bool v, string code) { if (!v) throw new Exception(code); }
        static void Expect(Action call, string code)
        {
            try { call(); } catch (InvalidOperationException e) { Check(e.Message == code, "Неожиданная ошибка: " + e.Message); return; }
            throw new Exception("Не получена ожидаемая ошибка: " + code);
        }
        sealed class Case
        {
            public string DataRoot, DirectoryPath;
            public BenchmarkRunJournal.Identity Id;
            public DateTime Now = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            public bool Allowed = true;
            public int WorkCalls;
            public Func<DateTime> Clock;
            public Case(string root, string name)
            {
                DataRoot = Path.Combine(root, name); Check(DataRoot.Length <= 100, "Слишком длинный тестовый корень");
                Directory.CreateDirectory(DataRoot);
                Directory.CreateDirectory(Path.Combine(DataRoot, "vaults")); Directory.CreateDirectory(Path.Combine(DataRoot, "history"));
                File.WriteAllText(Path.Combine(DataRoot, "vaults", "keep.md"), "vault-sentinel");
                File.WriteAllText(Path.Combine(DataRoot, "history", "keep.md"), "history-sentinel");
                BenchmarkFileCycle.Execute(DataRoot, 1, 1, delegate { });
                Id = new BenchmarkRunJournal.Identity(7, 11, Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
                DirectoryPath = Path.Combine(DataRoot, "Bench", Id.Run.ToString("N")); Directory.CreateDirectory(DirectoryPath);
                Clock = delegate { return Now; };
                BenchmarkRunJournal.Initialize(DirectoryPath, Id, 2, 1, 2, Clock, Auth);
            }
            public void Auth() { if (!Allowed) throw new InvalidOperationException("permission_revoked"); }
            public BenchmarkFileCycle.Result Work(BenchmarkRunJournal.Snapshot s, Action guard)
            { WorkCalls++; return BenchmarkFileCycle.Execute(DataRoot, s.Actors, s.SizeKiB, guard); }
            public BenchmarkRunJournal.Snapshot State() { return BenchmarkRunJournal.Read(DirectoryPath, Id, delegate { }); }
            public void Absent()
            {
                foreach (string path in Directory.GetDirectories(Path.Combine(DataRoot, "Bench")))
                    if (!String.Equals(path, DirectoryPath, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("payload_present");
                if (File.Exists(Path.Combine(DirectoryPath, "payload.keep"))) throw new InvalidOperationException("payload_present");
                Check(File.ReadAllText(Path.Combine(DataRoot, "vaults", "keep.md")) == "vault-sentinel", "Изменены контрольные файлы vaults");
                Check(File.ReadAllText(Path.Combine(DataRoot, "history", "keep.md")) == "history-sentinel", "Изменены контрольные файлы history");
            }
            public BenchmarkFileCycle.Result Step(int index)
            { return BenchmarkRunStep.Execute(DirectoryPath, Id, index, Clock, Auth, Work); }
        }
        public static int Run(string root)
        {
            int passed = 0;
            Case c = new Case(root, "ok"); BenchmarkFileCycle.Result result = c.Step(0);
            Check(result.CleanupConfirmed && result.VerifiedReads == 6 && c.State().Next == 1 && c.State().Phase == 0, "Неверный результат совместного шага");
            c.Absent(); Check(File.Exists(Path.Combine(c.DirectoryPath, "journal.bin")), "Журнал удалён"); passed++;
            Expect(delegate { c.Step(0); }, "benchmark_sequence_mismatch"); Check(c.WorkCalls == 1 && c.State().Next == 1, "Повторное выполнение файлового шага"); passed++;
            BenchmarkRunJournal.Identity foreign = new BenchmarkRunJournal.Identity(8, c.Id.Session, c.Id.Grant, c.Id.Request, c.Id.Run);
            Expect(delegate { BenchmarkRunStep.Execute(c.DirectoryPath, foreign, 1, c.Clock, c.Auth, c.Work); }, "benchmark_run_not_found"); Check(c.WorkCalls == 1, "Выполнен чужой шаг"); passed++;
            c.Step(1); Check(c.State().Next == 2 && c.WorkCalls == 2, "Неверный второй шаг");
            BenchmarkRunStep.StopAndConfirm(c.DirectoryPath, c.Id, delegate { }, c.Absent);
            Check(c.State().Phase == 2 && c.State().CleanupConfirmed, "Не подтверждены остановка и очистка"); passed++;
            c = new Case(root, "busy"); bool blocked = false;
            BenchmarkRunStep.Execute(c.DirectoryPath, c.Id, 0, c.Clock, c.Auth, delegate(BenchmarkRunJournal.Snapshot s, Action guard) {
                try { BenchmarkRunStep.StopAndConfirm(c.DirectoryPath, c.Id, delegate { }, c.Absent); } catch (IOException) { blocked = true; }
                return c.Work(s, guard);
            }); Check(blocked && c.State().Next == 1, "Остановка не согласована с файловой операцией"); c.Absent(); passed++;
            c = new Case(root, "lost");
            Expect(delegate { BenchmarkRunStep.Execute(c.DirectoryPath, c.Id, 0, c.Clock, c.Auth, delegate(BenchmarkRunJournal.Snapshot s, Action guard) { throw new InvalidOperationException("interrupted"); }); }, "interrupted");
            Check(c.State().Phase == 1 && c.State().Next == 0, "Потеряно неопределённое состояние");
            Expect(delegate { c.Step(0); }, "benchmark_sequence_mismatch"); Check(c.WorkCalls == 0, "Прерванный шаг выполнен повторно");
            BenchmarkRunStep.StopAndConfirm(c.DirectoryPath, c.Id, delegate { }, c.Absent); Check(c.State().CleanupConfirmed, "Не подтверждена очистка прерванного шага"); passed++;
            c = new Case(root, "revoked");
            Expect(delegate { BenchmarkRunStep.Execute(c.DirectoryPath, c.Id, 0, c.Clock, c.Auth, delegate(BenchmarkRunJournal.Snapshot s, Action guard) { c.Allowed = false; return c.Work(s, guard); }); }, "permission_revoked");
            Check(c.State().Phase == 1 && c.State().Next == 0, "Отзыв полномочий проигнорирован");
            BenchmarkRunStep.StopAndConfirm(c.DirectoryPath, c.Id, delegate { }, c.Absent); Check(c.State().CleanupConfirmed, "Очистка после отзыва заблокирована"); passed++;
            c = new Case(root, "invalid");
            Expect(delegate { BenchmarkRunStep.Execute(c.DirectoryPath, c.Id, 0, c.Clock, c.Auth, delegate(BenchmarkRunJournal.Snapshot s, Action guard) { return new BenchmarkFileCycle.Result { CleanupConfirmed = false }; }); }, "benchmark_incorrect_result");
            Check(c.State().Next == 0 && c.State().Phase == 1, "Непроверенный результат принят"); passed++;
            c = new Case(root, "residue"); File.WriteAllText(Path.Combine(c.DirectoryPath, "payload.keep"), "keep");
            Expect(delegate { BenchmarkRunStep.StopAndConfirm(c.DirectoryPath, c.Id, delegate { }, c.Absent); }, "payload_present");
            Check(c.State().Phase == 2 && !c.State().CleanupConfirmed && File.ReadAllText(Path.Combine(c.DirectoryPath, "payload.keep")) == "keep", "Остаток принят как очищенный или удалён"); passed++;
            c = new Case(root, "late");
            Expect(delegate { BenchmarkRunStep.Execute(c.DirectoryPath, c.Id, 0, c.Clock, c.Auth, delegate(BenchmarkRunJournal.Snapshot s, Action guard) { BenchmarkFileCycle.Result r = c.Work(s, guard); c.Now = c.Now.AddSeconds(121); return r; }); }, "benchmark_run_closed");
            Check(c.State().Phase == 1 && c.State().Next == 0, "Поздний результат принят"); c.Absent(); passed++;
            return passed;
        }
    }
}
'@
$testRoot = [System.IO.Path]::GetFullPath((Join-Path $repo ('.wvs-' + [Guid]::NewGuid().ToString('N'))))
if ($testRoot.Length + 8 -gt 100) { throw 'Путь рабочей копии слишком длинен для файловых проверок; остановка' }
if ([System.IO.Directory]::Exists($testRoot) -or [System.IO.File]::Exists($testRoot)) { throw 'Конфликт имени тестового каталога; остановка' }
Add-Type -TypeDefinition ($imports + [Environment]::NewLine + ($parts -join [Environment]::NewLine) + [Environment]::NewLine + $harness) -Language CSharp -ErrorAction Stop
[void][System.IO.Directory]::CreateDirectory($testRoot)
function Remove-TestTree([string]$path) {
    $a = [System.IO.File]::GetAttributes($path)
    if (($a -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Отказ очистки тестового reparse point' }
    if (($a -band [System.IO.FileAttributes]::Directory) -ne 0) {
        foreach ($child in [System.IO.Directory]::GetFileSystemEntries($path)) { Remove-TestTree $child }
        [System.IO.Directory]::Delete($path, $false)
    } else { [System.IO.File]::Delete($path) }
}
try {
    $count = [WebVaultStepTests.Harness]::Run($testRoot)
    if ($count -ne 10) { throw "Неожиданное число групп проверок: $count" }
    Write-Output ("PASS: {0}/10 coordinated-step groups; CLR {1}" -f $count, [Environment]::Version)
} finally { Remove-TestTree $testRoot }
