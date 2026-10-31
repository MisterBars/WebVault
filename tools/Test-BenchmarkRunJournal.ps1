<#
.SYNOPSIS
Standalone Windows/.NET tests for the benchmark metadata journal, not HTTP/IIS.
#>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
$repo = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
$source = [System.IO.File]::ReadAllText((Join-Path $repo 'src\WebVault.Web\App_Code\BenchmarkRunJournal.cs'))
$harness = @'
namespace WebVaultJournalTests
{
    using System;
    using System.IO;
    using WebVault;
    public static class Harness
    {
        static void Check(bool v, string text) { if (!v) throw new Exception(text); }
        static void Expect(Action f, string code)
        {
            try { f(); } catch (InvalidOperationException e) { Check(e.Message == code, "wrong error: " + e.Message); return; }
            throw new Exception("missing error: " + code);
        }
        static BenchmarkRunJournal.Identity Id(int owner, long session, Guid grant, Guid request, Guid run)
        { return new BenchmarkRunJournal.Identity(owner, session, grant, request, run); }
        static string Dir(string root, string name) { string d = Path.Combine(root, name); Directory.CreateDirectory(d); return d; }
        public static int Run(string root)
        {
            int passed = 0; Guid grant = Guid.NewGuid(), request = Guid.NewGuid(), run = Guid.NewGuid();
            BenchmarkRunJournal.Identity id = Id(7, 11, grant, request, run);
            DateTime now = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc); Func<DateTime> clock = delegate { return now; };
            string d = Dir(root, "persist");
            BenchmarkRunJournal.Snapshot initial = BenchmarkRunJournal.Initialize(d, id, 2, 4, 6, clock, delegate { });
            BenchmarkRunJournal.Snapshot state = BenchmarkRunJournal.Read(d, id, delegate { });
            Check(state.Next == 0 && state.Count == 6 && state.Phase == 0 && state.ExpiresUtcTicks == now.AddSeconds(120).Ticks, "initial snapshot");
            Check(new FileInfo(Path.Combine(d, "journal.bin")).Length == 122, "record length"); passed++;
            BenchmarkRunJournal.Begin(d, id, 0, clock, delegate { }); now = now.AddSeconds(1);
            state = BenchmarkRunJournal.Initialize(d, id, 2, 4, 6, clock, delegate { });
            Check(state.Phase == 1 && state.Next == 0 && state.ExpiresUtcTicks == initial.ExpiresUtcTicks, "initialize reset working record"); passed++;
            Expect(delegate { BenchmarkRunJournal.Begin(d, id, 0, clock, delegate { }); }, "benchmark_sequence_mismatch");
            Check(BenchmarkRunJournal.Read(d, id, delegate { }).Phase == 1, "working state lost after reopen"); passed++;
            BenchmarkRunJournal.Complete(d, id, 0, clock, delegate { });
            Expect(delegate { BenchmarkRunJournal.Complete(d, id, 0, clock, delegate { }); }, "benchmark_sequence_mismatch");
            Check(BenchmarkRunJournal.Read(d, id, delegate { }).Next == 1, "duplicate complete advanced state"); passed++;
            Expect(delegate { BenchmarkRunJournal.Read(d, Id(8, 11, grant, request, run), delegate { }); }, "benchmark_run_not_found");
            Expect(delegate { BenchmarkRunJournal.Read(d, Id(7, 12, grant, request, run), delegate { }); }, "benchmark_run_not_found");
            Expect(delegate { BenchmarkRunJournal.Read(d, Id(7, 11, grant, Guid.NewGuid(), run), delegate { }); }, "benchmark_run_not_found"); passed++;
            BenchmarkRunJournal.Identity changed = Id(7, 11, Guid.NewGuid(), request, run);
            Expect(delegate { BenchmarkRunJournal.Begin(d, changed, 1, clock, delegate { }); }, "benchmark_permission_changed");
            Expect(delegate { BenchmarkRunJournal.Begin(d, id, 1, clock, delegate { throw new InvalidOperationException("denied"); }); }, "denied");
            Check(BenchmarkRunJournal.Read(d, id, delegate { }).Phase == 0, "denied begin changed phase"); passed++;
            int calls = 0;
            Expect(delegate { BenchmarkRunJournal.Begin(d, id, 1, clock, delegate { if (++calls == 2) now = now.AddSeconds(120); }); }, "benchmark_run_closed");
            Check(BenchmarkRunJournal.Read(d, id, delegate { }).Phase == 0, "late authorization accepted"); passed++;
            BenchmarkRunJournal.Stop(d, changed, delegate { });
            Expect(delegate { BenchmarkRunJournal.Begin(d, id, 1, clock, delegate { }); }, "benchmark_run_closed");
            Expect(delegate { BenchmarkRunJournal.ConfirmCleanup(d, changed, delegate { }, delegate { throw new InvalidOperationException("payload_present"); }); }, "payload_present");
            Check(!BenchmarkRunJournal.Read(d, id, delegate { }).CleanupConfirmed, "failed verification confirmed cleanup");
            state = BenchmarkRunJournal.ConfirmCleanup(d, changed, delegate { }, delegate { });
            Check(state.Phase == 2 && state.CleanupConfirmed, "cleanup confirmation missing"); passed++;
            d = Dir(root, "corrupt"); BenchmarkRunJournal.Initialize(d, id, 1, 1, 1, clock, delegate { });
            byte[] bytes = File.ReadAllBytes(Path.Combine(d, "journal.bin")); bytes[0] ^= 1; File.WriteAllBytes(Path.Combine(d, "journal.bin"), bytes);
            Expect(delegate { BenchmarkRunJournal.Read(d, id, delegate { }); }, "benchmark_journal_invalid"); passed++;
            d = Dir(root, "pending"); BenchmarkRunJournal.Initialize(d, id, 1, 1, 1, clock, delegate { });
            File.WriteAllText(Path.Combine(d, "journal.new"), "interrupted-write");
            Expect(delegate { BenchmarkRunJournal.Read(d, id, delegate { }); }, "benchmark_journal_uncertain");
            Expect(delegate { BenchmarkRunJournal.Begin(d, id, 0, clock, delegate { }); }, "benchmark_journal_uncertain");
            Check(File.ReadAllText(Path.Combine(d, "journal.new")) == "interrupted-write", "pending data overwritten"); passed++;
            d = Dir(root, "lease"); BenchmarkRunJournal.Initialize(d, id, 1, 1, 1, clock, delegate { });
            bool locked = false;
            using (FileStream gate = new FileStream(Path.Combine(d, "journal.lock"), FileMode.Open, FileAccess.ReadWrite, FileShare.None))
            { try { BenchmarkRunJournal.Read(d, id, delegate { }); } catch (IOException) { locked = true; } }
            Check(locked && BenchmarkRunJournal.Read(d, id, delegate { }).Next == 0, "lease bypassed"); passed++;
            Expect(delegate { BenchmarkRunJournal.Initialize(d, id, 1, 2, 1, clock, delegate { }); }, "benchmark_request_conflict");
            state = BenchmarkRunJournal.Read(d, id, delegate { }); Check(state.SizeKiB == 1 && state.Next == 0, "conflicting init changed data"); passed++;
            d = Dir(root, "exhausted"); BenchmarkRunJournal.Initialize(d, id, 1, 1, 1, clock, delegate { });
            Expect(delegate { BenchmarkRunJournal.ConfirmCleanup(d, id, delegate { }, delegate { }); }, "benchmark_stop_required");
            BenchmarkRunJournal.Begin(d, id, 0, clock, delegate { }); BenchmarkRunJournal.Complete(d, id, 0, clock, delegate { });
            Expect(delegate { BenchmarkRunJournal.Begin(d, id, 1, clock, delegate { }); }, "benchmark_sequence_mismatch");
            Check(BenchmarkRunJournal.Read(d, id, delegate { }).Next == 1, "exhausted counter changed"); passed++;
            return passed;
        }
    }
}
'@
$testRoot = [System.IO.Path]::GetFullPath((Join-Path $repo ('.wvj-' + [Guid]::NewGuid().ToString('N'))))
if ($testRoot.Length + 12 -gt 200) { throw 'Checkout path too long for journal fixtures; stop' }
if ([System.IO.Directory]::Exists($testRoot) -or [System.IO.File]::Exists($testRoot)) { throw 'Test directory collision; stop' }
Add-Type -TypeDefinition ($source + [Environment]::NewLine + $harness) -Language CSharp -ErrorAction Stop
[void][System.IO.Directory]::CreateDirectory($testRoot)
function Remove-TestTree([string]$path) {
    $a = [System.IO.File]::GetAttributes($path)
    if (($a -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Refusing reparse point in test cleanup' }
    if (($a -band [System.IO.FileAttributes]::Directory) -ne 0) {
        foreach ($child in [System.IO.Directory]::GetFileSystemEntries($path)) { Remove-TestTree $child }
        [System.IO.Directory]::Delete($path, $false)
    } else { [System.IO.File]::Delete($path) }
}
try {
    $count = [WebVaultJournalTests.Harness]::Run($testRoot)
    if ($count -ne 13) { throw "Unexpected check count: $count" }
    Write-Output ("PASS: {0}/13 run-journal groups; CLR {1}" -f $count, [Environment]::Version)
} finally { Remove-TestTree $testRoot }
