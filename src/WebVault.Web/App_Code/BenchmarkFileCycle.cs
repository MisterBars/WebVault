using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace WebVault
{
    // Preparation only: no HTTP endpoint calls this class yet.
    // Caller supplies validated DataRoot and a mandatory live authorization callback.
    // Actors are directories, NOT auth.Users or concurrent sessions.
    public static class BenchmarkFileCycle
    {
        const string Magic = "WebVault Bench root v1\n";
        static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);
        public sealed class Result
        {
            public string RunId;
            public int Actors, BytesPerFile, VerifiedReads;
            public double CycleMs;
            public bool CleanupConfirmed;
        }
        static void Fail(string code) { throw new InvalidOperationException(code); }
        static void Plain(string path)
        {
            DirectoryInfo d = new DirectoryInfo(path);
            if (!d.Exists) Fail("benchmark_directory_missing");
            while (d != null)
            {
                if ((d.Attributes & FileAttributes.ReparsePoint) != 0) Fail("benchmark_reparse_rejected");
                d = d.Parent;
            }
        }
        static void Regular(string path)
        {
            FileAttributes a = File.GetAttributes(path);
            if ((a & (FileAttributes.ReparsePoint | FileAttributes.Directory)) != 0) Fail("benchmark_file_invalid");
        }
        static string Child(string parent, string name)
        {
            string path = Path.GetFullPath(Path.Combine(parent, name));
            if (path.Length > 240 || !path.StartsWith(parent.TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase)) Fail("benchmark_path_invalid");
            return path;
        }
        static void WriteNew(string path, byte[] bytes)
        {
            using (FileStream f = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            { f.Write(bytes, 0, bytes.Length); f.Flush(true); }
        }
        static void Verify(string path, byte[] expected)
        {
            Plain(Path.GetDirectoryName(path)); Regular(path);
            using (FileStream f = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.None))
            {
                if (f.Length != expected.Length) Fail("benchmark_content_mismatch");
                byte[] bytes = new byte[expected.Length]; int offset = 0, n;
                while (offset < bytes.Length && (n = f.Read(bytes, offset, bytes.Length - offset)) > 0) offset += n;
                if (offset != bytes.Length) Fail("benchmark_content_mismatch");
                for (int i = 0; i < bytes.Length; i++) if (bytes[i] != expected[i]) Fail("benchmark_content_mismatch");
                if (f.ReadByte() != -1) Fail("benchmark_content_mismatch");
            }
        }
        static byte[] Fixture(int actor, int revision, int bytes)
        {
            string header = "WVBench/1|actor=" + actor.ToString(CultureInfo.InvariantCulture) + "|revision=" + revision.ToString(CultureInfo.InvariantCulture) + "\n";
            byte[] value = new byte[bytes], h = Utf8.GetBytes(header);
            Buffer.BlockCopy(h, 0, value, 0, h.Length);
            for (int i = h.Length; i < value.Length; i++) value[i] = revision == 0 ? (byte)'x' : (byte)'y';
            return value;
        }
        static void Budget(Stopwatch watch, Action authorize)
        {
            authorize();
            if (watch.ElapsedMilliseconds >= 120000) Fail("benchmark_deadline");
        }
        static string Root(string dataRoot)
        {
            if (String.IsNullOrEmpty(dataRoot) || !Regex.IsMatch(dataRoot, @"\A[A-Za-z]:[\\/]")) Fail("benchmark_root_invalid");
            string data = Path.GetFullPath(dataRoot).TrimEnd('\\', '/');
            if (data.Length < 4 || data.Length > 100) Fail("benchmark_root_invalid");
            Plain(data);
            string bench = Child(data, "Bench"), marker = Child(bench, ".wv-bench-root");
            if (File.Exists(bench)) Fail("benchmark_root_invalid");
            bool existed = Directory.Exists(bench);
            if (!existed)
            {
                Directory.CreateDirectory(bench); Plain(bench);
                // A crash before the marker leaves an unclaimed directory: fail closed next time.
                try { WriteNew(marker, Utf8.GetBytes(Magic)); }
                catch (IOException) { if (!File.Exists(marker)) throw; }
            }
            Plain(bench);
            if (!File.Exists(marker)) Fail("benchmark_root_unclaimed");
            Verify(marker, Utf8.GetBytes(Magic));
            return bench;
        }
        static void DeleteFile(string path)
        {
            if (Directory.Exists(path)) Fail("benchmark_cleanup_unconfirmed");
            if (File.Exists(path)) { Plain(Path.GetDirectoryName(path)); Regular(path); File.Delete(path); }
            if (File.Exists(path) || Directory.Exists(path)) Fail("benchmark_cleanup_unconfirmed");
        }
        static void Cleanup(string run, string owner, int actors)
        {
            Plain(run); Verify(Child(run, "owner.txt"), Utf8.GetBytes(owner));
            string vaults = Child(run, "vaults");
            if (File.Exists(vaults)) Fail("benchmark_cleanup_unconfirmed");
            if (Directory.Exists(vaults))
            {
                Plain(vaults);
                for (int a = 1; a <= actors; a++)
                {
                    string dir = Child(vaults, "actor-" + a.ToString("D4", CultureInfo.InvariantCulture));
                    if (File.Exists(dir)) Fail("benchmark_cleanup_unconfirmed");
                    if (!Directory.Exists(dir)) continue;
                    Plain(dir); DeleteFile(Child(dir, "note.md")); DeleteFile(Child(dir, "update.tmp"));
                    Directory.Delete(dir, false);
                }
                Directory.Delete(vaults, false);
            }
            // Unknown entries prevent deletion; never use Directory.Delete(..., true).
            foreach (string entry in Directory.EnumerateFileSystemEntries(run))
                if (!String.Equals(entry, Child(run, "owner.txt"), StringComparison.OrdinalIgnoreCase)) Fail("benchmark_cleanup_unconfirmed");
            DeleteFile(Child(run, "owner.txt")); Directory.Delete(run, false);
            if (Directory.Exists(run) || File.Exists(run)) Fail("benchmark_cleanup_unconfirmed");
        }
        /// <summary>
        /// Synchronous isolated IO probe; not the personal note-save pipeline.
        /// Does not authenticate, create accounts, recover old runs or measure HTTP.
        /// Requires Windows/.NET 4.5. A host must reject DataRoot inside its website.
        /// Existing unknown Bench directories are never adopted or recursively removed.
        /// Residue from process termination counts against the 32-directory quota.
        /// </summary>
        public static Result Execute(string dataRoot, int actors, int sizeKiB, Action authorize)
        {
            if (authorize == null) throw new ArgumentNullException("authorize");
            if (actors < 1 || actors > 8 || sizeKiB < 1 || sizeKiB > 64) throw new ArgumentOutOfRangeException("parameters");
            Stopwatch budget = Stopwatch.StartNew(); Budget(budget, authorize);
            string bench = Root(dataRoot), lockPath = Child(bench, "root.lock");
            if (Directory.Exists(lockPath)) Fail("benchmark_lock_invalid");
            if (File.Exists(lockPath)) Regular(lockPath);
            // Exclusive across IIS workers; this first probe serializes entire cycles.
            // Contention fails, never sleeps or retries filesystem mutations.
            using (FileStream gate = new FileStream(lockPath, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None))
            {
                Plain(bench); Verify(Child(bench, ".wv-bench-root"), Utf8.GetBytes(Magic));
                int directories = 0;
                foreach (string entry in Directory.EnumerateFileSystemEntries(bench))
                {
                    string name = Path.GetFileName(entry);
                    if (name == ".wv-bench-root" || name == "root.lock") { Regular(entry); continue; }
                    if (!Regex.IsMatch(name, @"\A[a-f0-9]{32}\z")) Fail("benchmark_unknown_entry");
                    Plain(entry); if (++directories >= 32) Fail("benchmark_capacity");
                }
                Budget(budget, authorize);
                string id = Guid.NewGuid().ToString("N"), run = Child(bench, id), owner = "WebVault Bench cycle v1|" + id + "|" + actors.ToString(CultureInfo.InvariantCulture) + "\n";
                if (File.Exists(run) || Directory.Exists(run)) Fail("benchmark_collision");
                Directory.CreateDirectory(run); Plain(run);
                // Marker creation failure leaves unclaimed residue, never a cleanup target.
                WriteNew(Child(run, "owner.txt"), Utf8.GetBytes(owner));
                Exception failure = null, cleanupFailure = null; Result result = null;
                try
                {
                    string vaults = Child(run, "vaults"); Directory.CreateDirectory(vaults); Plain(vaults);
                    Stopwatch cycle = Stopwatch.StartNew();
                    for (int a = 1; a <= actors; a++)
                    {
                        Budget(budget, authorize);
                        string dir = Child(vaults, "actor-" + a.ToString("D4", CultureInfo.InvariantCulture));
                        Directory.CreateDirectory(dir); Plain(dir);
                        string note = Child(dir, "note.md"), temp = Child(dir, "update.tmp");
                        byte[] before = Fixture(a, 0, sizeKiB * 1024), after = Fixture(a, 1, sizeKiB * 1024);
                        WriteNew(note, before); Budget(budget, authorize); Verify(note, before);
                        Budget(budget, authorize); WriteNew(temp, after); Verify(note, before); Regular(note);
                        File.Replace(temp, note, null); Budget(budget, authorize); Verify(note, after);
                        Budget(budget, authorize); DeleteFile(note); Directory.Delete(dir, false);
                    }
                    cycle.Stop(); Budget(budget, authorize);
                    result = new Result { RunId = id, Actors = actors, BytesPerFile = sizeKiB * 1024, VerifiedReads = actors * 3, CycleMs = cycle.Elapsed.TotalMilliseconds };
                }
                catch (Exception e) { failure = e; }
                try { Cleanup(run, owner, actors); } catch (Exception e) { cleanupFailure = e; }
                if (cleanupFailure != null) throw new InvalidOperationException("benchmark_cleanup_unconfirmed", cleanupFailure);
                if (failure != null) throw new InvalidOperationException("benchmark_cycle_failed", failure);
                Budget(budget, authorize); result.CleanupConfirmed = true; return result;
            }
        }
    }
}
