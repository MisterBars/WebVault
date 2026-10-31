using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace WebVault
{
    // Доверенный серверный каталог. HTTP и настоящий адаптер сессий пока отсутствуют.
    public static class BenchmarkRunCatalog
    {
        const string Magic = "WebVault Bench root v1\n";
        static readonly UTF8Encoding Utf8 = new UTF8Encoding(false, true);
        public sealed class Entry
        {
            public string DirectoryPath;
            public BenchmarkRunJournal.Identity Identity;
            public BenchmarkRunJournal.Snapshot State;
        }
        static void Fail(string code) { throw new InvalidOperationException(code); }
        static void Call(Action action) { if (action == null) throw new ArgumentNullException("action"); action(); }
        static void Plain(string path)
        {
            DirectoryInfo d = new DirectoryInfo(path);
            if (!d.Exists) Fail("benchmark_directory_missing");
            while (d != null) { if ((d.Attributes & FileAttributes.ReparsePoint) != 0) Fail("benchmark_reparse_rejected"); d = d.Parent; }
        }
        static byte[] Bytes(string path, int length)
        {
            if ((File.GetAttributes(path) & (FileAttributes.Directory | FileAttributes.ReparsePoint)) != 0) Fail("benchmark_catalog_invalid");
            byte[] bytes = new byte[length];
            using (FileStream f = new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.Read))
            {
                if (f.Length != length) Fail("benchmark_catalog_invalid");
                int n = 0, k; while (n < length && (k = f.Read(bytes,n,length-n)) > 0) n += k;
                if (n != length) Fail("benchmark_catalog_invalid");
            }
            return bytes;
        }
        static void Marker(string bench)
        {
            Plain(bench); byte[] expected = Utf8.GetBytes(Magic), actual = Bytes(Path.Combine(bench,".wv-bench-root"),expected.Length);
            for (int i = 0; i < expected.Length; i++) if (expected[i] != actual[i]) Fail("benchmark_catalog_invalid");
        }
        static string Root(string dataRoot, bool create)
        {
            if (String.IsNullOrEmpty(dataRoot) || !Regex.IsMatch(dataRoot,@"\A[A-Za-z]:[\\/]")) Fail("benchmark_root_invalid");
            string root = Path.GetFullPath(dataRoot).TrimEnd('\\','/');
            if (root.Length < 4 || root.Length > 100) Fail("benchmark_root_invalid"); Plain(root);
            string bench = Path.Combine(root,"Bench");
            if (File.Exists(bench)) Fail("benchmark_root_invalid");
            if (!Directory.Exists(bench))
            {
                if (!create) return null;
                Directory.CreateDirectory(bench); Plain(bench);
                using (FileStream f = new FileStream(Path.Combine(bench,".wv-bench-root"),FileMode.CreateNew,FileAccess.Write,FileShare.None))
                { byte[] bytes = Utf8.GetBytes(Magic); f.Write(bytes,0,bytes.Length); f.Flush(true); }
            }
            Marker(bench); return bench;
        }
        static FileStream Lease(string bench)
        {
            Marker(bench); string path = Path.Combine(bench,"root.lock");
            if (Directory.Exists(path)) Fail("benchmark_catalog_invalid");
            if (File.Exists(path) && (File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0) Fail("benchmark_reparse_rejected");
            return new FileStream(path,FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None);
        }
        static List<string> Directories(string bench)
        {
            List<string> result = new List<string>(); int entries = 0;
            foreach (string path in Directory.EnumerateFileSystemEntries(bench))
            {
                if (++entries > 34) Fail("benchmark_capacity"); string name = Path.GetFileName(path);
                if (name == ".wv-bench-root" || name == "root.lock") continue;
                if (!Regex.IsMatch(name,@"\A[a-f0-9]{32}\z")) Fail("benchmark_unknown_entry");
                Plain(path); result.Add(path);
            }
            return result;
        }
        public static Guid RunId(int owner, long session, Guid request)
        {
            if (owner <= 0 || session <= 0 || request == Guid.Empty) throw new ArgumentException("benchmark_identity_invalid");
            string value = "WebVault.Bench.Request.v1|" + owner.ToString(CultureInfo.InvariantCulture) + "|" + session.ToString(CultureInfo.InvariantCulture) + "|" + request.ToString("N");
            using (SHA256 hash = SHA256.Create()) { byte[] first = new byte[16]; Buffer.BlockCopy(hash.ComputeHash(Utf8.GetBytes(value)),0,first,0,16); return new Guid(first); }
        }
        // Чтение идентичности нужно для внутреннего подсчёта квот, не для выдачи чужих данных.
        static Entry Load(string directory, Action authenticateCaller)
        {
            Plain(directory); byte[] bytes = Bytes(Path.Combine(directory,"journal.bin"),122);
            using (SHA256 hash = SHA256.Create()) { byte[] digest = hash.ComputeHash(bytes,0,90); for (int i = 0; i < 32; i++) if (digest[i] != bytes[90+i]) Fail("benchmark_catalog_invalid"); }
            BenchmarkRunJournal.Identity id;
            using (BinaryReader b = new BinaryReader(new MemoryStream(bytes,0,90)))
            {
                if (b.ReadInt32() != 0x57424a31) Fail("benchmark_catalog_invalid"); int owner = b.ReadInt32(); long session = b.ReadInt64();
                id = new BenchmarkRunJournal.Identity(owner,session,new Guid(b.ReadBytes(16)),new Guid(b.ReadBytes(16)),new Guid(b.ReadBytes(16)));
            }
            if (!String.Equals(Path.GetFileName(directory),id.Run.ToString("N"),StringComparison.Ordinal) || RunId(id.Owner,id.Session,id.Request) != id.Run) Fail("benchmark_catalog_invalid");
            BenchmarkRunJournal.Snapshot state = BenchmarkRunJournal.Read(directory,id,authenticateCaller);
            return new Entry { DirectoryPath = directory, Identity = id, State = state };
        }
        public static Entry Find(string dataRoot, int owner, long session, Guid request, Action authenticateSameSession)
        {
            Guid run = RunId(owner,session,request); Call(authenticateSameSession); string bench = Root(dataRoot,false);
            if (bench == null) { Call(authenticateSameSession); return null; }
            using (FileStream gate = Lease(bench))
            {
                string target = Path.Combine(bench,run.ToString("N")); List<string> dirs = Directories(bench);
                if (!dirs.Contains(target)) { Call(authenticateSameSession); return null; }
                if (!File.Exists(Path.Combine(target,"journal.bin"))) Fail("benchmark_run_unconfirmed");
                Entry entry = Load(target,authenticateSameSession);
                if (entry.Identity.Owner != owner || entry.Identity.Session != session || entry.Identity.Request != request) Fail("benchmark_run_not_found");
                Call(authenticateSameSession); return entry;
            }
        }
        public static Entry Start(string dataRoot, int owner, long session, Guid grant, Guid request,
            int actors, int sizeKiB, int count, Func<DateTime> clock, Action authorize)
        {
            Guid run = RunId(owner,session,request);
            BenchmarkRunJournal.Identity id = new BenchmarkRunJournal.Identity(owner,session,grant,request,run);
            if (actors < 1 || actors > 8 || sizeKiB < 1 || sizeKiB > 64 || count < 1 || count > 104 || clock == null) throw new ArgumentException("benchmark_parameters_invalid");
            DateTime now = clock(); if (now.Kind != DateTimeKind.Utc || now > DateTime.MaxValue.AddSeconds(-120)) throw new ArgumentException("benchmark_clock_invalid");
            Call(authorize); string bench = Root(dataRoot,true);
            using (FileStream gate = Lease(bench))
            {
                List<string> dirs = Directories(bench); string target = Path.Combine(bench,run.ToString("N"));
                if (dirs.Contains(target))
                {
                    if (!File.Exists(Path.Combine(target,"journal.bin"))) Fail("benchmark_run_unconfirmed");
                    Entry existing = Load(target,authorize);
                    if (existing.Identity.Owner != owner || existing.Identity.Session != session || existing.Identity.Request != request) Fail("benchmark_run_not_found");
                    BenchmarkRunJournal.Snapshot old = BenchmarkRunJournal.Initialize(target,id,actors,sizeKiB,count,clock,authorize);
                    Call(authorize); existing.State = old; return existing;
                }
                int unfinished = 0;
                foreach (string directory in dirs)
                {
                    string journal = Path.Combine(directory,"journal.bin");
                    if (!File.Exists(journal)) continue; // Файловые каталоги и неизвестные остатки занимают физическую квоту.
                    Entry entry = Load(directory,authorize);
                    if (!entry.State.CleanupConfirmed)
                    {
                        unfinished++;
                        if (entry.Identity.Owner == owner) Fail("benchmark_already_running");
                    }
                }
                // Оставляем место для одного файлового каталога при глобально последовательном ядре.
                if (unfinished >= 8 || dirs.Count >= 31) Fail("benchmark_capacity");
                Call(authorize); Directory.CreateDirectory(target); Plain(target);
                BenchmarkRunJournal.Snapshot state = BenchmarkRunJournal.Initialize(target,id,actors,sizeKiB,count,clock,authorize);
                Call(authorize); return new Entry { DirectoryPath = target, Identity = id, State = state };
            }
        }
    }
}
