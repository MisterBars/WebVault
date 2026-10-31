<#
.SYNOPSIS
Compile the isolated .NET Framework file-cycle helper and test only temporary data.
.DESCRIPTION
Run in Windows PowerShell with .NET Framework 4.5 or newer. Does not use IIS,
SQL, a live DataRoot, npm, or the browser. Failure throws and must stop the package.
The helper is not connected to any HTTP route or UI in this preparation package.
#>
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
$repo = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
$source = [System.IO.File]::ReadAllText((Join-Path $repo 'src\WebVault.Web\App_Code\BenchmarkFileCycle.cs'))
$harness = @'
namespace WebVaultBenchTests
{
    using System;
    using System.IO;
    using System.Text;
    using WebVault;
    public static class Harness
    {
        static int passed;
        static void Check(bool value, string message) { if (!value) throw new Exception(message); }
        static string Data(string root, string name)
        {
            string p = Path.Combine(root, name); Directory.CreateDirectory(p);
            Directory.CreateDirectory(Path.Combine(p, "vaults")); Directory.CreateDirectory(Path.Combine(p, "history"));
            File.WriteAllText(Path.Combine(p, "vaults", "sentinel.md"), "personal-vault-sentinel");
            File.WriteAllText(Path.Combine(p, "history", "sentinel.md"), "personal-history-sentinel"); return p;
        }
        static void Sentinels(string p)
        {
            Check(File.ReadAllText(Path.Combine(p, "vaults", "sentinel.md")) == "personal-vault-sentinel", "vault changed");
            Check(File.ReadAllText(Path.Combine(p, "history", "sentinel.md")) == "personal-history-sentinel", "history changed");
        }
        static void EmptyBench(string p)
        {
            string b = Path.Combine(p, "Bench");
            Check(Directory.GetDirectories(b).Length == 0, "run residue");
            Check(Directory.GetFiles(b).Length == 2, "unexpected root files"); Sentinels(p);
        }
        static bool Fails(Action call)
        {
            try { call(); return false; } catch (Exception) { return true; }
        }
        public static int Run(string root)
        {
            passed = 0;
            string p = Data(root, "one");
            BenchmarkFileCycle.Result r = BenchmarkFileCycle.Execute(p, 1, 1, delegate { });
            Check(r.CleanupConfirmed && r.Actors == 1 && r.BytesPerFile == 1024 && r.VerifiedReads == 3 && r.CycleMs >= 0, "single result"); EmptyBench(p); passed++;
            p = Data(root, "multiple"); r = BenchmarkFileCycle.Execute(p, 8, 64, delegate { });
            Check(r.CleanupConfirmed && r.VerifiedReads == 24 && r.BytesPerFile == 65536, "multiple result"); EmptyBench(p); passed++;
            p = Data(root, "repeat");
            r = BenchmarkFileCycle.Execute(p, 2, 2, delegate { }); string first = r.RunId;
            r = BenchmarkFileCycle.Execute(p, 2, 2, delegate { }); Check(first != r.RunId, "run identity reused"); EmptyBench(p); passed++;
            p = Data(root, "parameters");
            Check(Fails(delegate { BenchmarkFileCycle.Execute(p, 0, 1, delegate { }); }), "actors minimum");
            Check(Fails(delegate { BenchmarkFileCycle.Execute(p, 9, 1, delegate { }); }), "actors maximum");
            Check(Fails(delegate { BenchmarkFileCycle.Execute(p, 1, 0, delegate { }); }), "size minimum");
            Check(Fails(delegate { BenchmarkFileCycle.Execute(p, 1, 65, delegate { }); }), "size maximum");
            Check(Fails(delegate { BenchmarkFileCycle.Execute(p, 1, 1, null); }), "authorization required");
            Check(!Directory.Exists(Path.Combine(p, "Bench")), "invalid input caused IO"); Sentinels(p); passed++;
            p = Data(root, "denied");
            Check(Fails(delegate { BenchmarkFileCycle.Execute(p, 1, 1, delegate { throw new UnauthorizedAccessException(); }); }), "denial ignored");
            Check(!Directory.Exists(Path.Combine(p, "Bench")), "denial created Bench"); Sentinels(p); passed++;
            p = Data(root, "revoked"); int calls = 0;
            Check(Fails(delegate { BenchmarkFileCycle.Execute(p, 1, 1, delegate { if (++calls == 4) throw new UnauthorizedAccessException(); }); }), "revocation ignored");
            Check(calls == 4, "continued after denial"); EmptyBench(p); passed++;
            p = Data(root, "unclaimed"); string bench = Path.Combine(p, "Bench"); Directory.CreateDirectory(bench);
            File.WriteAllText(Path.Combine(bench, "keep.txt"), "not-owned");
            Check(Fails(delegate { BenchmarkFileCycle.Execute(p, 1, 1, delegate { }); }), "unclaimed root adopted");
            Check(File.ReadAllText(Path.Combine(bench, "keep.txt")) == "not-owned", "unknown file changed"); Sentinels(p); passed++;
            p = Data(root, "unknown-root-entry"); BenchmarkFileCycle.Execute(p, 1, 1, delegate { }); bench = Path.Combine(p, "Bench");
            File.WriteAllText(Path.Combine(bench, "keep.txt"), "not-owned");
            Check(Fails(delegate { BenchmarkFileCycle.Execute(p, 1, 1, delegate { }); }), "unknown root entry ignored");
            Check(File.ReadAllText(Path.Combine(bench, "keep.txt")) == "not-owned", "unknown root entry deleted"); Sentinels(p); passed++;
            p = Data(root, "exclusive"); BenchmarkFileCycle.Execute(p, 1, 1, delegate { }); bench = Path.Combine(p, "Bench");
            using (FileStream gate = new FileStream(Path.Combine(bench, "root.lock"), FileMode.Open, FileAccess.ReadWrite, FileShare.None))
                Check(Fails(delegate { BenchmarkFileCycle.Execute(p, 1, 1, delegate { }); }), "exclusive lock bypassed");
            EmptyBench(p); passed++;
            p = Data(root, "quota"); BenchmarkFileCycle.Execute(p, 1, 1, delegate { }); bench = Path.Combine(p, "Bench");
            for (int i = 0; i < 32; i++) Directory.CreateDirectory(Path.Combine(bench, i.ToString("x32")));
            Check(Fails(delegate { BenchmarkFileCycle.Execute(p, 1, 1, delegate { }); }), "residue quota bypassed");
            Check(Directory.GetDirectories(bench).Length == 32, "residue changed"); Sentinels(p); passed++;
            p = Data(root, "cleanup-refusal"); calls = 0; string unknown = null;
            bool rejected = false;
            try { BenchmarkFileCycle.Execute(p, 1, 1, delegate {
                if (++calls == 3) { string[] dirs = Directory.GetDirectories(Path.Combine(p, "Bench")); Check(dirs.Length == 1, "fixture run missing"); unknown = Path.Combine(dirs[0], "unknown.txt"); File.WriteAllText(unknown, "keep"); }
            }); } catch (InvalidOperationException e) { rejected = e.Message == "benchmark_cleanup_unconfirmed"; }
            Check(rejected, "unknown run entry did not block cleanup"); Check(unknown != null && File.ReadAllText(unknown) == "keep", "unknown run entry deleted"); Sentinels(p); passed++;
            return passed;
        }
    }
}
'@
Add-Type -TypeDefinition ($source + [Environment]::NewLine + $harness) -Language CSharp -ErrorAction Stop
$testRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('WVBenchCycleTests-' + [Guid]::NewGuid().ToString('N'))
[void][System.IO.Directory]::CreateDirectory($testRoot)
function Remove-TestTree([string]$path) {
    $attributes = [System.IO.File]::GetAttributes($path)
    if (($attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Refusing reparse point in test cleanup' }
    if (($attributes -band [System.IO.FileAttributes]::Directory) -ne 0) {
        foreach ($child in [System.IO.Directory]::GetFileSystemEntries($path)) { Remove-TestTree $child }
        [System.IO.Directory]::Delete($path, $false)
    } else { [System.IO.File]::Delete($path) }
}
try {
    $count = [WebVaultBenchTests.Harness]::Run($testRoot)
    if ($count -ne 11) { throw "Unexpected check count: $count" }
    Write-Output ("PASS: {0}/11 file-cycle groups; CLR {1}" -f $count, [Environment]::Version)
} finally {
    Remove-TestTree $testRoot
}
