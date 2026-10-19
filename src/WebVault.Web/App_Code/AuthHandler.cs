using System;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web;
using System.Web.Caching;
using System.Web.Script.Serialization;

namespace WebVault
{
    public sealed class AuthHandler : IHttpHandler
    {
        private static readonly SemaphoreSlim PasswordSlots = new SemaphoreSlim(2, 2);
        private static readonly object RateLock = new object();
        private const string SessionCookie = "WebVaultSession";
        private const string CsrfCookie = "WebVaultCsrf";
        private sealed class ApiError : Exception
        {
            public int Status; public string Code;
            public ApiError(int status, string code) { Status = status; Code = code; }
        }
        public sealed class Credentials
        {
            public string login { get; set; }
            public string password { get; set; }
            public string displayName { get; set; }
        }
        private sealed class Session
        {
            public long Id; public int UserId; public string Login; public string Name; public bool Admin; public byte[] Csrf;
        }
        public bool IsReusable { get { return false; } }
        private static SqlConnection Open()
        {
            ConnectionStringSettings settings = ConfigurationManager.ConnectionStrings["WebVault"];
            if (settings == null) throw new ConfigurationErrorsException("Missing WebVault connection.");
            SqlConnection connection = new SqlConnection(settings.ConnectionString);
            try { connection.Open(); return connection; } catch { connection.Dispose(); throw; }
        }
        private static SqlParameter P(SqlCommand command, string name, SqlDbType type, object value, int size)
        {
            SqlParameter parameter = size > 0 ? command.Parameters.Add(name, type, size) : command.Parameters.Add(name, type);
            parameter.Value = value ?? DBNull.Value; return parameter;
        }
        private static void Reply(HttpContext context, int status, object data)
        {
            context.Response.StatusCode = status;
            context.Response.Write(new JavaScriptSerializer().Serialize(data));
        }
        private static void RequireMethod(HttpContext context, string method)
        {
            if (context.Request.HttpMethod != method)
            {
                context.Response.AppendHeader("Allow", method);
                throw new ApiError(405, "method_not_allowed");
            }
        }
        private static void CheckPost(HttpContext context)
        {
            RequireMethod(context, "POST");
            if (context.Request.Headers["X-WebVault-Request"] != "1") throw new ApiError(403, "request_header_required");
            string contentType = (context.Request.ContentType ?? "").Split(';')[0].Trim();
            if (!String.Equals(contentType, "application/json", StringComparison.OrdinalIgnoreCase)) throw new ApiError(415, "json_required");
            string origin = context.Request.Headers["Origin"];
            if (!String.IsNullOrEmpty(origin) && !String.Equals(origin, context.Request.Url.GetLeftPart(UriPartial.Authority), StringComparison.OrdinalIgnoreCase))
                throw new ApiError(403, "origin_rejected");
        }
        private static Credentials Read(HttpContext context)
        {
            if (context.Request.ContentLength > 4096) throw new ApiError(413, "request_too_large");
            using (StreamReader reader = new StreamReader(context.Request.InputStream, System.Text.Encoding.UTF8))
            {
                char[] buffer = new char[4097]; int count = 0; int read;
                while (count < buffer.Length && (read = reader.Read(buffer, count, buffer.Length - count)) > 0) count += read;
                if (count > 4096) throw new ApiError(413, "request_too_large");
                Credentials value;
                try { value = new JavaScriptSerializer().Deserialize<Credentials>(new string(buffer, 0, count)); }
                catch (ArgumentException) { throw new ApiError(400, "invalid_json"); }
                catch (InvalidOperationException) { throw new ApiError(400, "invalid_json"); }
                if (value == null) throw new ApiError(400, "invalid_json");
                value.login = (value.login ?? "").Trim();
                if (!Regex.IsMatch(value.login, @"\A[A-Za-z0-9_.-]{3,64}\z") || value.password == null || value.password.Length > 128 || value.password.Length == 0)
                    throw new ApiError(400, "invalid_credentials_format");
                return value;
            }
        }
        private static void Rate(HttpContext context)
        {
            string key = "WebVault.Auth.Rate:" + context.Request.UserHostAddress;
            lock (RateLock)
            {
                object stored = HttpRuntime.Cache[key]; int count = stored == null ? 0 : (int)stored;
                if (count >= 20) throw new ApiError(429, "rate_limited");
                HttpRuntime.Cache.Insert(key, count + 1, null, DateTime.UtcNow.AddMinutes(10), Cache.NoSlidingExpiration);
            }
        }
        private static string Cookie(HttpContext context, string name)
        {
            HttpCookie cookie = context.Request.Cookies[name];
            return cookie == null ? null : cookie.Value;
        }
        private static string Token(HttpContext context, string name)
        {
            string token = Cookie(context, name);
            if (token == null || token.Length != 44) throw new ApiError(401, "unauthenticated");
            try { if (Convert.FromBase64String(token).Length != 32) throw new FormatException(); }
            catch (FormatException) { throw new ApiError(401, "unauthenticated"); }
            return token;
        }
        private static void SetCookie(HttpContext context, string name, string value, bool remove)
        {
            HttpCookie cookie = new HttpCookie(name, value);
            cookie.HttpOnly = true; cookie.Secure = context.Request.IsSecureConnection;
            cookie.Path = String.IsNullOrEmpty(context.Request.ApplicationPath) ? "/" : context.Request.ApplicationPath;
            if (remove) cookie.Expires = DateTime.UtcNow.AddDays(-1);
            context.Response.Cookies.Set(cookie);
        }
        private static Session Current(HttpContext context)
        {
            string token = Token(context, SessionCookie);
            using (SqlConnection connection = Open())
            using (SqlCommand command = new SqlCommand(@"SELECT s.SessionId,u.UserId,u.Login,u.DisplayName,u.IsAdmin,s.CsrfTokenHash
FROM auth.UserSessions s JOIN auth.Users u ON u.UserId=s.UserId
WHERE s.TokenHash=@hash AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME()
AND s.AbsoluteExpiresUtc>SYSUTCDATETIME() AND u.IsActive=1;", connection))
            {
                P(command, "@hash", SqlDbType.Binary, AuthCrypto.Hash(token), 32);
                using (SqlDataReader reader = command.ExecuteReader())
                {
                    if (!reader.Read()) throw new ApiError(401, "unauthenticated");
                    return new Session { Id=reader.GetInt64(0), UserId=reader.GetInt32(1), Login=reader.GetString(2), Name=reader.GetString(3), Admin=reader.GetBoolean(4), Csrf=(byte[])reader[5] };
                }
            }
        }
        private static string CheckCsrf(HttpContext context, Session session, bool requireHeader)
        {
            string token = Token(context, CsrfCookie);
            if (!AuthCrypto.Equal(AuthCrypto.Hash(token), session.Csrf)) throw new ApiError(403, "csrf_rejected");
            if (requireHeader)
            {
                string header = context.Request.Headers["X-CSRF-Token"];
                if (header == null || header.Length != 44 || !AuthCrypto.Equal(AuthCrypto.Hash(header), session.Csrf)) throw new ApiError(403, "csrf_rejected");
            }
            return token;
        }
        private static void Me(HttpContext context)
        {
            RequireMethod(context, "GET"); Session session = Current(context);
            string csrf = CheckCsrf(context, session, false);
            using (SqlConnection connection = Open())
            using (SqlCommand command = new SqlCommand(@"UPDATE s SET LastSeenUtc=SYSUTCDATETIME(),
ExpiresUtc=CASE WHEN DATEADD(minute,30,SYSUTCDATETIME())<s.AbsoluteExpiresUtc THEN DATEADD(minute,30,SYSUTCDATETIME()) ELSE s.AbsoluteExpiresUtc END
FROM auth.UserSessions s JOIN auth.Users u ON u.UserId=s.UserId
WHERE s.SessionId=@id AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME() AND s.AbsoluteExpiresUtc>SYSUTCDATETIME() AND u.IsActive=1;", connection))
            {
                P(command, "@id", SqlDbType.BigInt, session.Id, 0);
                if (command.ExecuteNonQuery() != 1) throw new ApiError(401, "unauthenticated");
            }
            Reply(context, 200, new { ok=true, user=new { id=session.UserId, login=session.Login, displayName=session.Name, isAdmin=session.Admin }, csrfToken=csrf });
        }
        private static void Logout(HttpContext context)
        {
            Session session = Current(context); CheckCsrf(context, session, true);
            using (SqlConnection connection = Open())
            using (SqlCommand command = new SqlCommand("UPDATE auth.UserSessions SET RevokedUtc=SYSUTCDATETIME() WHERE SessionId=@id AND RevokedUtc IS NULL", connection))
            { P(command, "@id", SqlDbType.BigInt, session.Id, 0); command.ExecuteNonQuery(); }
            SetCookie(context, SessionCookie, "", true); SetCookie(context, CsrfCookie, "", true);
            Reply(context, 200, new { ok=true });
        }
        private static void Setup(HttpContext context, Credentials input)
        {
            if (!context.Request.IsLocal) throw new ApiError(403, "local_only");
            string configured = ConfigurationManager.AppSettings["AdminSetupKey"] ?? "";
            string supplied = context.Request.Headers["X-Setup-Key"] ?? "";
            if (ConfigurationManager.AppSettings["AdminSetupEnabled"] != "true" || configured.Length < 40) throw new ApiError(403, "setup_disabled");
            if (supplied.Length > 256 || !AuthCrypto.Equal(AuthCrypto.Hash(configured), AuthCrypto.Hash(supplied))) throw new ApiError(403, "setup_key_rejected");
            if (input.password.Length < 15) throw new ApiError(400, "password_too_short");
            string display = (input.displayName ?? "").Trim();
            if (display.Length == 0 || display.Length > 100) throw new ApiError(400, "invalid_display_name");
            byte[] salt = AuthCrypto.Random(32); byte[] hash = AuthCrypto.Password(input.password, salt, AuthCrypto.Iterations);
            using (SqlConnection connection = Open())
            using (SqlTransaction transaction = connection.BeginTransaction(IsolationLevel.Serializable))
            {
                using (SqlCommand command = new SqlCommand("SELECT COUNT_BIG(*) FROM auth.Users WITH (TABLOCKX,HOLDLOCK)", connection, transaction))
                    if ((long)command.ExecuteScalar() != 0) throw new ApiError(409, "already_initialized");
                using (SqlCommand command = new SqlCommand(@"INSERT auth.Users(Login,NormalizedLogin,DisplayName,PasswordHash,PasswordSalt,PasswordAlgorithm,PasswordIterations,IsAdmin)
VALUES(@login,@normalized,@name,@hash,@salt,@algorithm,@iterations,1)", connection, transaction))
                {
                    P(command, "@login", SqlDbType.NVarChar, input.login, 64);
                    P(command, "@normalized", SqlDbType.NVarChar, input.login.ToUpperInvariant(), 64);
                    P(command, "@name", SqlDbType.NVarChar, display, 100);
                    P(command, "@hash", SqlDbType.VarBinary, hash, 128);
                    P(command, "@salt", SqlDbType.VarBinary, salt, 64);
                    P(command, "@algorithm", SqlDbType.VarChar, AuthCrypto.Algorithm, 40);
                    P(command, "@iterations", SqlDbType.Int, AuthCrypto.Iterations, 0);
                    command.ExecuteNonQuery();
                }
                transaction.Commit();
            }
            Reply(context, 201, new { ok=true, next="login" });
        }
        private static void Login(HttpContext context, Credentials input)
        {
            string token = AuthCrypto.Token(); string csrf = AuthCrypto.Token();
            bool accepted = false;
            using (SqlConnection connection = Open())
            using (SqlTransaction transaction = connection.BeginTransaction())
            {
                int id=0, iterations=AuthCrypto.Iterations, failed=0; bool active=false, locked=false;
                string algorithm=""; int version=0; byte[] expected=null; byte[] salt=new byte[32];
                using (SqlCommand command = new SqlCommand(@"SELECT UserId,PasswordHash,PasswordSalt,PasswordAlgorithm,PasswordIterations,PasswordVersion,IsActive,
CASE WHEN LockoutUntilUtc>SYSUTCDATETIME() THEN 1 ELSE 0 END,
CASE WHEN LockoutUntilUtc IS NOT NULL AND LockoutUntilUtc<=SYSUTCDATETIME() THEN 0 ELSE FailedLoginCount END
FROM auth.Users WITH (UPDLOCK,ROWLOCK) WHERE NormalizedLogin=@login", connection, transaction))
                {
                    P(command, "@login", SqlDbType.NVarChar, input.login.ToUpperInvariant(), 64);
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            id=reader.GetInt32(0); expected=(byte[])reader[1]; salt=(byte[])reader[2]; algorithm=reader.GetString(3);
                            iterations=reader.GetInt32(4); version=reader.GetInt16(5); active=reader.GetBoolean(6); locked=reader.GetInt32(7)==1; failed=reader.GetInt32(8);
                        }
                    }
                }
                bool supported = algorithm == AuthCrypto.Algorithm && version == 1;
                byte[] computed = AuthCrypto.Password(input.password, supported ? salt : new byte[32], supported ? iterations : AuthCrypto.Iterations);
                accepted = id != 0 && supported && active && !locked && AuthCrypto.Equal(computed, expected);
                if (accepted)
                {
                    using (SqlCommand command = new SqlCommand(@"UPDATE auth.Users SET FailedLoginCount=0,LockoutUntilUtc=NULL,LastLoginUtc=SYSUTCDATETIME(),UpdatedUtc=SYSUTCDATETIME() WHERE UserId=@id;
DECLARE @now datetime2(3)=SYSUTCDATETIME();
INSERT auth.UserSessions(UserId,TokenHash,CsrfTokenHash,CreatedUtc,LastSeenUtc,ExpiresUtc,AbsoluteExpiresUtc)
VALUES(@id,@token,@csrf,@now,@now,DATEADD(minute,30,@now),DATEADD(hour,8,@now));", connection, transaction))
                    {
                        P(command, "@id", SqlDbType.Int, id, 0);
                        P(command, "@token", SqlDbType.Binary, AuthCrypto.Hash(token), 32);
                        P(command, "@csrf", SqlDbType.Binary, AuthCrypto.Hash(csrf), 32);
                        command.ExecuteNonQuery();
                    }
                }
                else if (id != 0 && active && !locked)
                {
                    using (SqlCommand command = new SqlCommand(@"UPDATE auth.Users SET FailedLoginCount=@failed,
LockoutUntilUtc=CASE WHEN @failed>=5 THEN DATEADD(minute,15,SYSUTCDATETIME()) ELSE NULL END,UpdatedUtc=SYSUTCDATETIME() WHERE UserId=@id", connection, transaction))
                    {
                        P(command, "@id", SqlDbType.Int, id, 0); P(command, "@failed", SqlDbType.Int, Math.Min(failed,4)+1, 0); command.ExecuteNonQuery();
                    }
                }
                transaction.Commit();
            }
            if (!accepted) throw new ApiError(401, "invalid_login_or_password");
            SetCookie(context, SessionCookie, token, false); SetCookie(context, CsrfCookie, csrf, false);
            Reply(context, 200, new { ok=true, next="me" });
        }
        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType="application/json"; context.Response.ContentEncoding=System.Text.Encoding.UTF8;
            context.Response.Cache.SetCacheability(HttpCacheability.NoCache); context.Response.Cache.SetNoStore();
            context.Response.TrySkipIisCustomErrors=true; context.Response.SuppressFormsAuthenticationRedirect=true;
            context.Response.AppendHeader("X-Content-Type-Options", "nosniff");
            bool slot=false;
            try
            {
                if (!context.Request.IsSecureConnection && !context.Request.IsLocal) throw new ApiError(403, "https_required");
                string action=Path.GetFileNameWithoutExtension(context.Request.Path).ToLowerInvariant();
                if (action == "me") { Me(context); return; }
                CheckPost(context);
                if (action == "logout") { Logout(context); return; }
                if (action != "setup" && action != "login") throw new ApiError(404, "not_found");
                Rate(context);
                if (!PasswordSlots.Wait(0)) throw new ApiError(429, "server_busy");
                slot=true; Credentials input=Read(context);
                if (action == "setup") Setup(context,input); else Login(context,input);
            }
            catch (ApiError error) { Reply(context,error.Status,new { ok=false,error=error.Code }); }
            catch (Exception exception)
            {
                string id=Guid.NewGuid().ToString("N");
                System.Diagnostics.Trace.TraceError("WebVault auth error {0}: {1}",id,exception.GetType().FullName);
                Reply(context,500,new { ok=false,error="server_error",errorId=id });
            }
            finally { if (slot) PasswordSlots.Release(); }
        }
    }
}
