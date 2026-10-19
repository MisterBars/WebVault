using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web;
namespace WebVault
{
    public sealed class AdminUsersHandler:IHttpHandler
    {
        private static readonly SemaphoreSlim CreateSlot=new SemaphoreSlim(1,1);
        public sealed class NewUser { public string login {get;set;} public string displayName {get;set;} public string password {get;set;} }
        public sealed class DeleteUser { public int userId {get;set;} }
        public bool IsReusable {get{return false;}}
        private static void CheckAdmin(SqlConnection connection,SqlTransaction transaction,ApiUser actor)
        {
            using(SqlCommand command=new SqlCommand(@"SELECT u.UserId FROM auth.Users u WITH (UPDLOCK,HOLDLOCK)
JOIN auth.UserSessions s WITH (UPDLOCK,HOLDLOCK) ON s.UserId=u.UserId
WHERE s.SessionId=@session AND u.UserId=@actor AND u.IsActive=1 AND u.IsAdmin=1 AND u.DeletedUtc IS NULL
AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME() AND s.AbsoluteExpiresUtc>SYSUTCDATETIME()",connection,transaction))
            {
                command.Parameters.Add("@session",SqlDbType.BigInt).Value=actor.SessionId;
                command.Parameters.Add("@actor",SqlDbType.Int).Value=actor.UserId;
                if(command.ExecuteScalar()==null) throw new ApiFailure(403,"administrator_required");
            }
        }
        private static void List(HttpContext context)
        {
            List<object> users=new List<object>();
            using(SqlConnection connection=WebApi.Open())
            using(SqlCommand command=new SqlCommand("SELECT TOP (200) UserId,Login,DisplayName,IsAdmin,IsActive FROM auth.Users WHERE DeletedUtc IS NULL ORDER BY UserId",connection))
            using(SqlDataReader reader=command.ExecuteReader())
                while(reader.Read()) users.Add(new {id=reader.GetInt32(0),login=reader.GetString(1),displayName=reader.GetString(2),isAdmin=reader.GetBoolean(3),isActive=reader.GetBoolean(4)});
            WebApi.Reply(context,200,new {ok=true,users=users,limit=200});
        }
        private static void Create(HttpContext context,ApiUser actor)
        {
            NewUser input=WebApi.Read<NewUser>(context);
            string login=(input.login??"").Trim(),name=(input.displayName??"").Trim();
            if(!Regex.IsMatch(login,@"\A[A-Za-z0-9_.-]{3,64}\z")) throw new ApiFailure(400,"invalid_login");
            if(name.Length==0||name.Length>100) throw new ApiFailure(400,"invalid_display_name");
            if(input.password==null||input.password.Length<15||input.password.Length>128) throw new ApiFailure(400,"invalid_password_length");
            if(!CreateSlot.Wait(0)) throw new ApiFailure(429,"server_busy");
            try
            {
                byte[] salt=AuthCrypto.Random(32),hash=AuthCrypto.Password(input.password,salt,AuthCrypto.Iterations); int id;
                using(SqlConnection connection=WebApi.Open())
                using(SqlTransaction transaction=connection.BeginTransaction())
                {
                    CheckAdmin(connection,transaction,actor);
                    using(SqlCommand command=new SqlCommand(@"INSERT auth.Users(Login,NormalizedLogin,DisplayName,PasswordHash,PasswordSalt,PasswordAlgorithm,PasswordIterations,IsAdmin)
OUTPUT INSERTED.UserId VALUES(@login,@normalized,@name,@hash,@salt,@algorithm,@iterations,0)",connection,transaction))
                    {
                        command.Parameters.Add("@login",SqlDbType.NVarChar,64).Value=login;
                        command.Parameters.Add("@normalized",SqlDbType.NVarChar,64).Value=login.ToUpperInvariant();
                        command.Parameters.Add("@name",SqlDbType.NVarChar,100).Value=name;
                        command.Parameters.Add("@hash",SqlDbType.VarBinary,128).Value=hash;
                        command.Parameters.Add("@salt",SqlDbType.VarBinary,64).Value=salt;
                        command.Parameters.Add("@algorithm",SqlDbType.VarChar,40).Value=AuthCrypto.Algorithm;
                        command.Parameters.Add("@iterations",SqlDbType.Int).Value=AuthCrypto.Iterations;
                        id=(int)command.ExecuteScalar();
                    }
                    transaction.Commit();
                }
                WebApi.Reply(context,201,new {ok=true,user=new {id=id,login=login,displayName=name,isAdmin=false}});
            }
            catch(SqlException exception)
            {
                if(exception.Number==2601||exception.Number==2627) throw new ApiFailure(409,"login_exists");
                throw;
            }
            finally {CreateSlot.Release();}
        }
        private static void Delete(HttpContext context,ApiUser actor)
        {
            DeleteUser input=WebApi.Read<DeleteUser>(context);
            if(input.userId<=0) throw new ApiFailure(400,"invalid_user_id");
            if(input.userId==actor.UserId) throw new ApiFailure(409,"cannot_delete_self");
            using(SqlConnection connection=WebApi.Open())
            using(SqlTransaction transaction=connection.BeginTransaction())
            {
                CheckAdmin(connection,transaction,actor);
                using(SqlCommand command=new SqlCommand(@"UPDATE auth.Users SET IsActive=0,DeletedUtc=SYSUTCDATETIME(),UpdatedUtc=SYSUTCDATETIME()
WHERE UserId=@id AND IsAdmin=0 AND DeletedUtc IS NULL;",connection,transaction))
                {
                    command.Parameters.Add("@id",SqlDbType.Int).Value=input.userId;
                    if(command.ExecuteNonQuery()!=1) throw new ApiFailure(409,"user_not_deletable");
                }
                using(SqlCommand command=new SqlCommand("UPDATE auth.UserSessions SET RevokedUtc=SYSUTCDATETIME() WHERE UserId=@id AND RevokedUtc IS NULL",connection,transaction))
                {command.Parameters.Add("@id",SqlDbType.Int).Value=input.userId;command.ExecuteNonQuery();}
                transaction.Commit();
            }
            WebApi.Reply(context,200,new {ok=true,deletedUserId=input.userId,mode="soft"});
        }
        public void ProcessRequest(HttpContext context)
        {
            try
            {
                WebApi.Prepare(context);
                bool deletion=String.Equals(Path.GetFileNameWithoutExtension(context.Request.Path),"user_delete",StringComparison.OrdinalIgnoreCase);
                bool write=deletion||context.Request.HttpMethod=="POST";
                if(write) WebApi.Post(context);else WebApi.Method(context,"GET");
                ApiUser user=WebApi.RequireUser(context,write);
                if(!user.IsAdmin) throw new ApiFailure(403,"administrator_required");
                if(deletion) Delete(context,user);else if(write) Create(context,user);else List(context);
            }
            catch(Exception exception){WebApi.Error(context,exception);}
        }
    }
}
