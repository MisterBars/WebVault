using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.IO;
using System.Text.RegularExpressions;
using System.Web;

namespace WebVault
{
    // Изолированный файловый HTTP-вход. По умолчанию новые операции выключены.
    public sealed class BenchmarkFilesHandler : IHttpHandler
    {
        public bool IsReusable { get { return false; } }
        public sealed class Command
        {
            public string Action;
            public Guid Request;
            public int Actors, SizeKiB, Count, Index;
        }
        static int Number(Dictionary<string,object> p,string key,int min,int max)
        {
            object value;
            if (!p.TryGetValue(key,out value) || !(value is int) || (int)value < min || (int)value > max) throw new ApiFailure(400,"invalid_parameter");
            return (int)value;
        }
        public static Command Parse(Dictionary<string,object> p)
        {
            if (p == null) throw new ApiFailure(400,"invalid_json");
            object value;
            if (!p.TryGetValue("action",out value) || !(value is string)) throw new ApiFailure(400,"invalid_parameter");
            string action = (string)value;
            if (action != "start" && action != "status" && action != "step" && action != "cancel") throw new ApiFailure(400,"invalid_action");
            string[] allowed = action == "start" ? new[] {"action","requestId","actors","sizeKiB","count"} : action == "step" ? new[] {"action","requestId","index"} : new[] {"action","requestId"};
            foreach (string key in p.Keys) if (Array.IndexOf(allowed,key) < 0) throw new ApiFailure(400,"unknown_parameter");
            Guid request;
            if (!p.TryGetValue("requestId",out value) || !(value is string) || !Regex.IsMatch((string)value,@"\A[a-f0-9]{32}\z") || !Guid.TryParseExact((string)value,"N",out request) || request == Guid.Empty) throw new ApiFailure(400,"invalid_request_id");
            Command c = new Command { Action = action, Request = request };
            if (action == "start") { c.Actors = Number(p,"actors",1,8); c.SizeKiB = Number(p,"sizeKiB",1,64); c.Count = Number(p,"count",1,13); }
            if (action == "step") c.Index = Number(p,"index",0,12);
            return c;
        }
        public static bool FlagEnabled(string value) { return String.Equals(value,"true",StringComparison.OrdinalIgnoreCase); }
        static bool Enabled() { return FlagEnabled(ConfigurationManager.AppSettings["BenchmarkFilesEnabled"]); }
        static void RequireEnabled() { if (!Enabled()) throw new ApiFailure(503,"benchmark_files_disabled"); }
        static void Schema()
        {
            using (SqlConnection db = WebApi.Open())
            using (SqlCommand q = new SqlCommand("SELECT COL_LENGTH(N'auth.Users',N'BenchmarkGrant')",db))
            { object v = q.ExecuteScalar(); if (v == null || v == DBNull.Value) throw new ApiFailure(503,"benchmark_schema_required"); }
        }
        static Guid Permission(ApiUser user)
        {
            using (SqlConnection db = WebApi.Open())
            using (SqlCommand q = new SqlCommand(@"SELECT u.BenchmarkGrant FROM auth.Users u JOIN auth.UserSessions s ON u.UserId=s.UserId
WHERE u.UserId=@u AND s.SessionId=@s AND u.IsActive=1 AND u.DeletedUtc IS NULL AND u.IsAdmin=0 AND u.MustChangePassword=0
AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME() AND s.AbsoluteExpiresUtc>SYSUTCDATETIME()",db))
            {
                q.Parameters.Add("@u",SqlDbType.Int).Value = user.UserId; q.Parameters.Add("@s",SqlDbType.BigInt).Value = user.SessionId;
                object v = q.ExecuteScalar(); if (v == null || v == DBNull.Value) throw new ApiFailure(403,"benchmark_permission_required"); return (Guid)v;
            }
        }
        static void SameSession(HttpContext c,ApiUser initial)
        {
            ApiUser now = WebApi.RequireUser(c,true);
            if (now.UserId != initial.UserId || now.SessionId != initial.SessionId || !AuthCrypto.Equal(now.CsrfHash,initial.CsrfHash)) throw new ApiFailure(409,"session_changed");
            if (now.IsAdmin) throw new ApiFailure(403,"ordinary_account_required");
        }
        static Action Authorized(HttpContext c,ApiUser initial,Guid grant)
        {
            return delegate {
                SameSession(c,initial); RequireEnabled();
                if (Permission(initial) != grant) throw new ApiFailure(403,"benchmark_permission_changed");
            };
        }
        public static object StateReply(BenchmarkRunCatalog.Entry entry,Guid request)
        {
            BenchmarkRunJournal.Snapshot s = entry == null ? null : entry.State;
            return new {
                ok = true, protocolVersion = 1, scenario = "server.files.cycle", scenarioVersion = 1, fixtureVersion = 1,
                requestId = request.ToString("N"), found = entry != null,
                runId = entry == null ? null : entry.Identity.Run.ToString("N"),
                state = s == null ? "absent" : new[] {"ready","working","stopped"}[s.Phase],
                next = s == null ? 0 : s.Next, count = s == null ? 0 : s.Count, actors = s == null ? 0 : s.Actors,
                bytes = s == null ? 0 : s.SizeKiB * 1024,
                expiresUtc = s == null ? null : new DateTime(s.ExpiresUtcTicks,DateTimeKind.Utc).ToString("o",CultureInfo.InvariantCulture),
                expired = s != null && DateTime.UtcNow.Ticks >= s.ExpiresUtcTicks,
                cleanup = s != null && s.CleanupConfirmed ? "ok" : "unconfirmed"
            };
        }
        public static Exception MapError(Exception e)
        {
            if (e is InvalidOperationException && e.Message == "benchmark_cleanup_unconfirmed") return new ApiFailure(409,"benchmark_cleanup_unconfirmed");
            Exception inner = e;
            for (int i = 0; i < 5 && inner != null; i++, inner = inner.InnerException) if (inner is ApiFailure) return inner;
            if (e is InvalidOperationException)
            {
                string[] conflicts = {"benchmark_already_running","benchmark_collision","benchmark_sequence_mismatch","benchmark_run_closed","benchmark_request_conflict","benchmark_run_unconfirmed","benchmark_journal_uncertain","benchmark_journal_invalid","benchmark_catalog_invalid","benchmark_root_invalid","benchmark_root_missing","benchmark_root_unclaimed","benchmark_unknown_entry","benchmark_reparse_rejected","benchmark_directory_missing","benchmark_directory_invalid","benchmark_lock_invalid","benchmark_file_invalid","benchmark_path_invalid","benchmark_content_mismatch","benchmark_incorrect_result","benchmark_stop_required"};
                if (Array.IndexOf(conflicts,e.Message) >= 0) return new ApiFailure(409,e.Message);
                if (e.Message == "benchmark_capacity") return new ApiFailure(429,"benchmark_capacity");
                if (e.Message == "benchmark_run_not_found") return new ApiFailure(404,"benchmark_run_not_found");
                if (e.Message == "benchmark_deadline") return new ApiFailure(409,"benchmark_run_closed");
            }
            if (e is UnauthorizedAccessException) return new ApiFailure(403,"benchmark_storage_denied");
            if (e is IOException)
            {
                int code = e.HResult & 65535;
                return new ApiFailure(code == 32 || code == 33 ? 409 : 503,code == 32 || code == 33 ? "benchmark_busy" : "benchmark_storage_uncertain");
            }
            return e; // WebApi.Error не выводит произвольные сообщения исключений клиенту.
        }
        public void ProcessRequest(HttpContext c)
        {
            try
            {
                WebApi.Prepare(c); WebApi.Post(c); ApiUser user = WebApi.RequireUser(c,true);
                if (user.IsAdmin) throw new ApiFailure(403,"ordinary_account_required");
                Command input = Parse(WebApi.Read<Dictionary<string,object>>(c));
                bool writes = input.Action == "start" || input.Action == "step";
                if (writes) { RequireEnabled(); Schema(); }
                Action same = delegate { SameSession(c,user); };
                // Действующий DataRoot проверяет также сайт и общие vaults/history, не личный VaultId.
                string root = VaultHandler.DataRoot(c);
                if (input.Action == "start")
                {
                    Guid grant = Permission(user); Action authorize = Authorized(c,user,grant);
                    BenchmarkRunCatalog.Entry entry = BenchmarkRunCatalog.Start(root,user.UserId,user.SessionId,grant,input.Request,input.Actors,input.SizeKiB,input.Count,delegate { return DateTime.UtcNow; },authorize);
                    authorize(); WebApi.Reply(c,200,StateReply(entry,input.Request)); return;
                }
                BenchmarkRunCatalog.Entry owned = BenchmarkRunCatalog.Find(root,user.UserId,user.SessionId,input.Request,same);
                if (input.Action == "status") { same(); WebApi.Reply(c,200,StateReply(owned,input.Request)); return; }
                if (owned == null) throw new ApiFailure(404,"benchmark_run_not_found");
                if (owned.State.Count > 13) throw new ApiFailure(409,"benchmark_request_conflict");
                if (input.Action == "cancel")
                {
                    owned.State = BenchmarkRunStep.StopAndConfirm(owned.DirectoryPath,owned.Identity,same,delegate {
                        for (int i = 0; i < owned.State.Count; i++) BenchmarkFileCycle.RecoverBound(root,owned.Identity.Run,i,owned.State.Actors,same);
                    });
                    same(); WebApi.Reply(c,200,StateReply(owned,input.Request)); return;
                }
                Action live = Authorized(c,user,owned.Identity.Grant);
                BenchmarkFileCycle.Result result = BenchmarkRunStep.Execute(owned.DirectoryPath,owned.Identity,input.Index,delegate { return DateTime.UtcNow; },live,
                    delegate(BenchmarkRunJournal.Snapshot s,Action guard) { return BenchmarkFileCycle.ExecuteBound(root,owned.Identity.Run,input.Index,s.Actors,s.SizeKiB,guard); });
                live();
                if (DateTime.UtcNow.Ticks >= owned.State.ExpiresUtcTicks) throw new ApiFailure(409,"benchmark_run_closed");
                WebApi.Reply(c,200,new { ok = true, protocolVersion = 1, scenario = "server.files.cycle", scenarioVersion = 1, fixtureVersion = 1,
                    requestId = input.Request.ToString("N"), runId = owned.Identity.Run.ToString("N"), payloadId = result.RunId, index = input.Index,
                    actors = result.Actors, bytes = result.BytesPerFile, verifiedReads = result.VerifiedReads, serverCycleMs = result.CycleMs,
                    cleanup = "ok", remainingObjects = 0 });
            }
            catch (Exception e) { WebApi.Error(c,MapError(e)); }
        }
    }
}
