using System;
using System.IO;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace WebVault
{
    // Standalone preparation primitive. No HTTP caller, filesystem janitor or SQL adapter yet.
    // directory MUST be a server-resolved isolated Bench run directory, never client input.
    public static class BenchmarkRunJournal
    {
        public sealed class Identity
        {
            public readonly int Owner;
            public readonly long Session;
            public readonly Guid Grant, Request, Run;
            public Identity(int owner, long session, Guid grant, Guid request, Guid run)
            {
                if (owner <= 0 || session <= 0 || grant == Guid.Empty || request == Guid.Empty || run == Guid.Empty) throw new ArgumentException("benchmark_identity_invalid");
                Owner = owner; Session = session; Grant = grant; Request = request; Run = run;
            }
        }
        public sealed class Snapshot
        {
            public int Next, Count, Actors, SizeKiB;
            public byte Phase; // 0 ready, 1 working/uncertain, 2 stopped
            public bool CleanupConfirmed;
            public long ExpiresUtcTicks;
        }
        sealed class Record
        {
            public Identity Identity;
            public Snapshot State;
        }
        static void Fail(string code) { throw new InvalidOperationException(code); }
        static void Callback(Action action)
        {
            if (action == null) throw new ArgumentNullException("action");
            action();
        }
        static void Plain(string directory)
        {
            if (String.IsNullOrEmpty(directory) || !Regex.IsMatch(directory, @"\A[A-Za-z]:[\\/]")) Fail("benchmark_directory_invalid");
            string full = Path.GetFullPath(directory);
            if (full.Length > 200) Fail("benchmark_directory_invalid");
            DirectoryInfo d = new DirectoryInfo(full);
            if (!d.Exists) Fail("benchmark_directory_missing");
            while (d != null)
            {
                if ((d.Attributes & FileAttributes.ReparsePoint) != 0) Fail("benchmark_reparse_rejected");
                d = d.Parent;
            }
        }
        static string PathOf(string directory, string name) { return Path.Combine(Path.GetFullPath(directory), name); }
        static void Regular(string path)
        {
            if ((File.GetAttributes(path) & (FileAttributes.Directory | FileAttributes.ReparsePoint)) != 0) Fail("benchmark_journal_invalid");
        }
        static FileStream Lease(string directory)
        {
            Plain(directory); string path = PathOf(directory, "journal.lock");
            if (Directory.Exists(path)) Fail("benchmark_journal_invalid");
            if (File.Exists(path)) Regular(path);
            return new FileStream(path, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
        }
        static void Settled(string directory)
        {
            Plain(directory);
            string temp = PathOf(directory, "journal.new");
            if (File.Exists(temp) || Directory.Exists(temp)) Fail("benchmark_journal_uncertain");
        }
        static byte[] Encode(Record r)
        {
            using (MemoryStream m = new MemoryStream())
            {
                using (BinaryWriter w = new BinaryWriter(m))
                {
                    w.Write(0x57424a31); w.Write(r.Identity.Owner); w.Write(r.Identity.Session);
                    w.Write(r.Identity.Grant.ToByteArray()); w.Write(r.Identity.Request.ToByteArray()); w.Write(r.Identity.Run.ToByteArray());
                    w.Write(r.State.ExpiresUtcTicks); w.Write(r.State.Actors); w.Write(r.State.SizeKiB);
                    w.Write(r.State.Count); w.Write(r.State.Next); w.Write(r.State.Phase); w.Write(r.State.CleanupConfirmed);
                    w.Flush(); byte[] payload = m.ToArray();
                    using (SHA256 hash = SHA256.Create())
                    {
                        byte[] digest = hash.ComputeHash(payload), output = new byte[payload.Length + digest.Length];
                        Buffer.BlockCopy(payload, 0, output, 0, payload.Length); Buffer.BlockCopy(digest, 0, output, payload.Length, digest.Length); return output;
                    }
                }
            }
        }
        static Record Load(string directory, Identity expected)
        {
            if (expected == null) throw new ArgumentNullException("expected");
            Settled(directory); string path = PathOf(directory, "journal.bin"); Regular(path);
            byte[] bytes = new byte[122];
            using (FileStream f = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read))
            {
                if (f.Length != bytes.Length) Fail("benchmark_journal_invalid");
                int n = 0, k; while (n < bytes.Length && (k = f.Read(bytes, n, bytes.Length - n)) > 0) n += k;
                if (n != bytes.Length) Fail("benchmark_journal_invalid");
            }
            using (SHA256 hash = SHA256.Create())
            {
                byte[] digest = hash.ComputeHash(bytes, 0, 90);
                for (int i = 0; i < 32; i++) if (digest[i] != bytes[90 + i]) Fail("benchmark_journal_invalid");
            }
            Record r = new Record();
            using (BinaryReader b = new BinaryReader(new MemoryStream(bytes, 0, 90)))
            {
                if (b.ReadInt32() != 0x57424a31) Fail("benchmark_journal_invalid");
                int owner = b.ReadInt32(); long session = b.ReadInt64();
                r.Identity = new Identity(owner, session, new Guid(b.ReadBytes(16)), new Guid(b.ReadBytes(16)), new Guid(b.ReadBytes(16)));
                r.State = new Snapshot { ExpiresUtcTicks = b.ReadInt64(), Actors = b.ReadInt32(), SizeKiB = b.ReadInt32(), Count = b.ReadInt32(), Next = b.ReadInt32(), Phase = b.ReadByte(), CleanupConfirmed = b.ReadBoolean() };
            }
            Snapshot s = r.State;
            if (s.Actors < 1 || s.Actors > 8 || s.SizeKiB < 1 || s.SizeKiB > 64 || s.Count < 1 || s.Count > 104 || s.Next < 0 || s.Next > s.Count || s.Phase > 2 || (s.Phase == 1 && s.Next == s.Count) || (s.CleanupConfirmed && s.Phase != 2) || s.ExpiresUtcTicks < DateTime.MinValue.Ticks || s.ExpiresUtcTicks > DateTime.MaxValue.Ticks) Fail("benchmark_journal_invalid");
            Identity id = r.Identity;
            if (id.Owner != expected.Owner || id.Session != expected.Session || id.Request != expected.Request || id.Run != expected.Run) Fail("benchmark_run_not_found");
            return r;
        }
        static void Save(string directory, Record record)
        {
            Settled(directory); string target = PathOf(directory, "journal.bin"), temp = PathOf(directory, "journal.new");
            byte[] bytes = Encode(record);
            using (FileStream f = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None)) { f.Write(bytes, 0, bytes.Length); f.Flush(true); }
            // A failed/interrupted replace leaves journal.new and blocks further mutations.
            if (File.Exists(target)) { Regular(target); File.Replace(temp, target, null); }
            else { if (Directory.Exists(target)) Fail("benchmark_journal_invalid"); File.Move(temp, target); }
        }
        static Snapshot Copy(Snapshot s) { return new Snapshot { Next = s.Next, Count = s.Count, Actors = s.Actors, SizeKiB = s.SizeKiB, Phase = s.Phase, CleanupConfirmed = s.CleanupConfirmed, ExpiresUtcTicks = s.ExpiresUtcTicks }; }
        static DateTime Now(Func<DateTime> clock)
        {
            if (clock == null) throw new ArgumentNullException("clock");
            DateTime now = clock();
            if (now.Kind != DateTimeKind.Utc) throw new ArgumentException("benchmark_clock_invalid");
            return now;
        }
        static void Live(Record r, Identity expected, DateTime utcNow)
        {
            if (utcNow.Kind != DateTimeKind.Utc) throw new ArgumentException("benchmark_clock_invalid");
            if (r.Identity.Grant != expected.Grant) Fail("benchmark_permission_changed");
            if (utcNow.Ticks >= r.State.ExpiresUtcTicks || r.State.Phase == 2) Fail("benchmark_run_closed");
        }
        public static Snapshot Initialize(string directory, Identity id, int actors, int sizeKiB, int count, Func<DateTime> clock, Action authorize)
        {
            if (id == null) throw new ArgumentNullException("id");
            DateTime utcNow = Now(clock);
            if (actors < 1 || actors > 8 || sizeKiB < 1 || sizeKiB > 64 || count < 1 || count > 104 || utcNow.Kind != DateTimeKind.Utc || utcNow > DateTime.MaxValue.AddSeconds(-120)) throw new ArgumentException("benchmark_parameters_invalid");
            Callback(authorize);
            using (FileStream gate = Lease(directory))
            {
                Settled(directory); string target = PathOf(directory, "journal.bin");
                if (File.Exists(target))
                {
                    Record old = Load(directory, id);
                    if (old.Identity.Grant != id.Grant || old.State.Actors != actors || old.State.SizeKiB != sizeKiB || old.State.Count != count) Fail("benchmark_request_conflict");
                    Callback(authorize); return Copy(old.State); // Never reset phase/next or extend deadline.
                }
                Callback(authorize); utcNow = Now(clock);
                if (utcNow > DateTime.MaxValue.AddSeconds(-120)) Fail("benchmark_clock_invalid");
                Record r = new Record { Identity = id, State = new Snapshot { Actors = actors, SizeKiB = sizeKiB, Count = count, Next = 0, Phase = 0, ExpiresUtcTicks = utcNow.AddSeconds(120).Ticks } };
                Save(directory, r); return Copy(r.State);
            }
        }
        public static Snapshot Read(string directory, Identity id, Action authenticateSameSession)
        {
            Callback(authenticateSameSession);
            using (FileStream gate = Lease(directory)) { Record r = Load(directory, id); Callback(authenticateSameSession); return Copy(r.State); }
        }
        public static Snapshot Begin(string directory, Identity id, int index, Func<DateTime> clock, Action authorize)
        {
            Callback(authorize);
            using (FileStream gate = Lease(directory))
            {
                Record r = Load(directory, id); Live(r, id, Now(clock));
                if (index != r.State.Next || r.State.Next >= r.State.Count || r.State.Phase != 0) Fail("benchmark_sequence_mismatch");
                Callback(authorize); Live(r, id, Now(clock)); r.State.Phase = 1; Save(directory, r); return Copy(r.State);
            }
        }
        public static Snapshot Complete(string directory, Identity id, int index, Func<DateTime> clock, Action authorize)
        {
            Callback(authorize);
            using (FileStream gate = Lease(directory))
            {
                Record r = Load(directory, id); Live(r, id, Now(clock));
                if (index != r.State.Next || r.State.Phase != 1) Fail("benchmark_sequence_mismatch");
                Callback(authorize); Live(r, id, Now(clock)); r.State.Next++; r.State.Phase = 0; Save(directory, r); return Copy(r.State);
            }
        }
        public static Snapshot Stop(string directory, Identity id, Action authenticateSameSession)
        {
            Callback(authenticateSameSession);
            using (FileStream gate = Lease(directory))
            {
                Record r = Load(directory, id); Callback(authenticateSameSession); r.State.Phase = 2; Save(directory, r); return Copy(r.State);
            }
        }
        public static Snapshot ConfirmCleanup(string directory, Identity id, Action authenticateSameSession, Action verifyPayloadAbsent)
        {
            if (verifyPayloadAbsent == null) throw new ArgumentNullException("verifyPayloadAbsent");
            Callback(authenticateSameSession);
            using (FileStream gate = Lease(directory))
            {
                Record r = Load(directory, id);
                if (r.State.Phase != 2) Fail("benchmark_stop_required");
                Callback(verifyPayloadAbsent); Callback(authenticateSameSession);
                r.State.CleanupConfirmed = true; Save(directory, r); return Copy(r.State);
            }
        }
    }
}
