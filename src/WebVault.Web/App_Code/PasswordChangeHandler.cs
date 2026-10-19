using System;
using System.Data;
using System.Data.SqlClient;
using System.Threading;
using System.Web;
using System.Web.Caching;
namespace WebVault
{
    public sealed class PasswordChangeHandler:IHttpHandler
    {
        private static readonly SemaphoreSlim Slot=new SemaphoreSlim(1,1);
        private static readonly object RateLock=new object();
        public sealed class Input
        {
            public string currentPassword {get;set;}
            public string newPassword {get;set;}
            public string confirmPassword {get;set;}
        }
        public bool IsReusable{get{return false;}}
        private static void Rate(int userId)
        {
            string key="WebVault.PasswordChange:"+userId;
            lock(RateLock)
            {
                object previous=HttpRuntime.Cache[key];int count=previous==null?0:(int)previous;
                if(count>=5) throw new ApiFailure(429,"password_change_rate_limited");
                HttpRuntime.Cache.Insert(key,count+1,null,DateTime.UtcNow.AddMinutes(10),Cache.NoSlidingExpiration);
            }
        }
        private static void ClearCookies(HttpContext context)
        {
            foreach(string name in new string[]{"WebVaultSession","WebVaultCsrf"})
            {
                HttpCookie cookie=new HttpCookie(name,"");cookie.HttpOnly=true;cookie.Secure=context.Request.IsSecureConnection;
                cookie.Path=String.IsNullOrEmpty(context.Request.ApplicationPath)?"/":context.Request.ApplicationPath;
                cookie.Expires=DateTime.UtcNow.AddDays(-1);context.Response.Cookies.Set(cookie);
            }
        }
        private static void Change(HttpContext context,ApiUser user,Input input)
        {
            if(input.currentPassword==null||input.currentPassword.Length==0||input.currentPassword.Length>128) throw new ApiFailure(400,"invalid_current_password_length");
            if(input.newPassword==null||input.newPassword.Length<15||input.newPassword.Length>128) throw new ApiFailure(400,"invalid_new_password_length");
            if(!String.Equals(input.newPassword,input.confirmPassword,StringComparison.Ordinal)) throw new ApiFailure(400,"passwords_do_not_match");
            if(String.Equals(input.newPassword,input.currentPassword,StringComparison.Ordinal)) throw new ApiFailure(400,"new_password_must_differ");
            Rate(user.UserId);
            if(!Slot.Wait(0)) throw new ApiFailure(429,"server_busy");
            try
            {
                using(SqlConnection connection=WebApi.Open())
                using(SqlTransaction transaction=connection.BeginTransaction())
                {
                    byte[] salt,expected;int iterations;
                    using(SqlCommand command=new SqlCommand(@"SELECT u.PasswordHash,u.PasswordSalt,u.PasswordAlgorithm,u.PasswordIterations,u.PasswordVersion
FROM auth.Users u WITH(UPDLOCK,HOLDLOCK) JOIN auth.UserSessions s WITH(UPDLOCK,HOLDLOCK) ON s.UserId=u.UserId
WHERE u.UserId=@id AND u.IsActive=1 AND u.DeletedUtc IS NULL AND s.SessionId=@session
AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME() AND s.AbsoluteExpiresUtc>SYSUTCDATETIME()",connection,transaction))
                    {
                        command.Parameters.Add("@id",SqlDbType.Int).Value=user.UserId;
                        command.Parameters.Add("@session",SqlDbType.BigInt).Value=user.SessionId;
                        using(SqlDataReader reader=command.ExecuteReader())
                        {
                            if(!reader.Read()) throw new ApiFailure(401,"unauthenticated");
                            if(reader.GetString(2)!=AuthCrypto.Algorithm||reader.GetInt16(4)!=1) throw new ApiFailure(409,"unsupported_password_format");
                            expected=(byte[])reader[0];salt=(byte[])reader[1];iterations=reader.GetInt32(3);
                        }
                    }
                    byte[] current=AuthCrypto.Password(input.currentPassword,salt,iterations);
                    if(!AuthCrypto.Equal(current,expected)) throw new ApiFailure(403,"current_password_incorrect");
                    byte[] newSalt=AuthCrypto.Random(32),newHash=AuthCrypto.Password(input.newPassword,newSalt,AuthCrypto.Iterations);
                    using(SqlCommand command=new SqlCommand(@"UPDATE auth.Users SET PasswordHash=@hash,PasswordSalt=@salt,PasswordAlgorithm=@algorithm,PasswordIterations=@iterations,PasswordVersion=1,
PasswordChangedUtc=SYSUTCDATETIME(),UpdatedUtc=SYSUTCDATETIME(),FailedLoginCount=0,LockoutUntilUtc=NULL
WHERE UserId=@id AND IsActive=1 AND DeletedUtc IS NULL AND EXISTS(SELECT 1 FROM auth.UserSessions
WHERE SessionId=@session AND UserId=@id AND RevokedUtc IS NULL AND ExpiresUtc>SYSUTCDATETIME() AND AbsoluteExpiresUtc>SYSUTCDATETIME());",connection,transaction))
                    {
                        command.Parameters.Add("@id",SqlDbType.Int).Value=user.UserId;
                        command.Parameters.Add("@session",SqlDbType.BigInt).Value=user.SessionId;
                        command.Parameters.Add("@hash",SqlDbType.VarBinary,128).Value=newHash;
                        command.Parameters.Add("@salt",SqlDbType.VarBinary,64).Value=newSalt;
                        command.Parameters.Add("@algorithm",SqlDbType.VarChar,40).Value=AuthCrypto.Algorithm;
                        command.Parameters.Add("@iterations",SqlDbType.Int).Value=AuthCrypto.Iterations;
                        if(command.ExecuteNonQuery()!=1) throw new ApiFailure(401,"unauthenticated");
                    }
                    using(SqlCommand command=new SqlCommand("UPDATE auth.UserSessions SET RevokedUtc=SYSUTCDATETIME() WHERE UserId=@id AND RevokedUtc IS NULL",connection,transaction))
                    {command.Parameters.Add("@id",SqlDbType.Int).Value=user.UserId;command.ExecuteNonQuery();}
                    transaction.Commit();
                }
                ClearCookies(context);
                WebApi.Reply(context,200,new{ok=true,reauthenticationRequired=true});
            }
            finally{Slot.Release();}
        }
        public void ProcessRequest(HttpContext context)
        {
            try
            {
                WebApi.Prepare(context);WebApi.Post(context);
                ApiUser user=WebApi.RequireUser(context,true);
                Change(context,user,WebApi.Read<Input>(context));
            }
            catch(Exception exception){WebApi.Error(context,exception);}
        }
    }
}
