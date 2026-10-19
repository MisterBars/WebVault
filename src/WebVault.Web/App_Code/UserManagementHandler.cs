using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Text.RegularExpressions;
using System.Web;
namespace WebVault
{
    public sealed class UserManagementHandler:IHttpHandler
    {
        public sealed class Change
        {
            public string action {get;set;}
            public int userId {get;set;}
            public string login {get;set;}
            public string displayName {get;set;}
            public string rowVersion {get;set;}
            public string confirmationLogin {get;set;}
        }
        public bool IsReusable {get{return false;}}
        private static void List(HttpContext context)
        {
            bool includeDeleted=context.Request.QueryString["includeDeleted"]=="1";
            List<object> users=new List<object>();
            using(SqlConnection connection=WebApi.Open())
            using(SqlCommand command=new SqlCommand(@"SELECT TOP(200) UserId,Login,DisplayName,IsAdmin,IsActive,
CASE WHEN DeletedUtc IS NULL THEN 0 ELSE 1 END,RowVersion FROM auth.Users
WHERE @include=1 OR DeletedUtc IS NULL ORDER BY UserId",connection))
            {
                command.Parameters.Add("@include",SqlDbType.Bit).Value=includeDeleted;
                using(SqlDataReader reader=command.ExecuteReader())
                    while(reader.Read()) users.Add(new {id=reader.GetInt32(0),login=reader.GetString(1),displayName=reader.GetString(2),isAdmin=reader.GetBoolean(3),isActive=reader.GetBoolean(4),isDeleted=reader.GetInt32(5)==1,rowVersion=Convert.ToBase64String((byte[])reader[6])});
            }
            WebApi.Reply(context,200,new {ok=true,users=users,limit=200});
        }
        private static void Actor(SqlConnection connection,SqlTransaction transaction,ApiUser actor)
        {
            using(SqlCommand command=new SqlCommand(@"SELECT u.UserId FROM auth.Users u WITH(UPDLOCK,HOLDLOCK)
JOIN auth.UserSessions s WITH(UPDLOCK,HOLDLOCK) ON s.UserId=u.UserId
WHERE u.UserId=@actor AND u.IsAdmin=1 AND u.IsActive=1 AND u.DeletedUtc IS NULL
AND s.SessionId=@session AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME() AND s.AbsoluteExpiresUtc>SYSUTCDATETIME()",connection,transaction))
            {
                command.Parameters.Add("@actor",SqlDbType.Int).Value=actor.UserId;
                command.Parameters.Add("@session",SqlDbType.BigInt).Value=actor.SessionId;
                if(command.ExecuteScalar()==null) throw new ApiFailure(403,"administrator_required");
            }
        }
        private static void Sessions(SqlConnection connection,SqlTransaction transaction,int id,bool remove)
        {
            string sql=remove?"DELETE FROM auth.UserSessions WHERE UserId=@id":"UPDATE auth.UserSessions SET RevokedUtc=SYSUTCDATETIME() WHERE UserId=@id AND RevokedUtc IS NULL";
            using(SqlCommand command=new SqlCommand(sql,connection,transaction))
            {command.Parameters.Add("@id",SqlDbType.Int).Value=id;command.ExecuteNonQuery();}
        }
        private static void Mutate(HttpContext context,ApiUser actor)
        {
            Change input=WebApi.Read<Change>(context);
            if(input.action!="rename"&&input.action!="soft_delete"&&input.action!="purge") throw new ApiFailure(400,"invalid_action");
            if(input.userId<=0) throw new ApiFailure(400,"invalid_user_id");
            if(input.userId==actor.UserId) throw new ApiFailure(409,"cannot_manage_self");
            byte[] version;
            try{version=Convert.FromBase64String(input.rowVersion??"");}
            catch(FormatException){throw new ApiFailure(400,"invalid_row_version");}
            if(version.Length!=8) throw new ApiFailure(400,"invalid_row_version");
            bool renamedLogin=false;
            using(SqlConnection connection=WebApi.Open())
            using(SqlTransaction transaction=connection.BeginTransaction())
            {
                Actor(connection,transaction,actor);
                string oldLogin;bool deleted;bool active;
                using(SqlCommand command=new SqlCommand(@"SELECT Login,IsAdmin,IsActive,DeletedUtc,RowVersion FROM auth.Users WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@id",connection,transaction))
                {
                    command.Parameters.Add("@id",SqlDbType.Int).Value=input.userId;
                    using(SqlDataReader reader=command.ExecuteReader())
                    {
                        if(!reader.Read()) throw new ApiFailure(404,"user_not_found");
                        if(reader.GetBoolean(1)) throw new ApiFailure(409,"cannot_manage_administrator");
                        if(!AuthCrypto.Equal(version,(byte[])reader[4])) throw new ApiFailure(409,"user_changed_reload_list");
                        oldLogin=reader.GetString(0);active=reader.GetBoolean(2);deleted=!reader.IsDBNull(3);
                    }
                }
                if(input.action=="rename")
                {
                    if(deleted) throw new ApiFailure(409,"deleted_user_not_editable");
                    string login=(input.login??"").Trim(),name=(input.displayName??"").Trim();
                    if(!Regex.IsMatch(login,@"\A[A-Za-z0-9_.-]{3,64}\z")) throw new ApiFailure(400,"invalid_login");
                    if(name.Length==0||name.Length>100) throw new ApiFailure(400,"invalid_display_name");
                    renamedLogin=!String.Equals(oldLogin,login,StringComparison.Ordinal);
                    using(SqlCommand command=new SqlCommand("UPDATE auth.Users SET Login=@login,NormalizedLogin=@normalized,DisplayName=@name,UpdatedUtc=SYSUTCDATETIME() WHERE UserId=@id",connection,transaction))
                    {
                        command.Parameters.Add("@id",SqlDbType.Int).Value=input.userId;
                        command.Parameters.Add("@login",SqlDbType.NVarChar,64).Value=login;
                        command.Parameters.Add("@normalized",SqlDbType.NVarChar,64).Value=login.ToUpperInvariant();
                        command.Parameters.Add("@name",SqlDbType.NVarChar,100).Value=name;
                        command.ExecuteNonQuery();
                    }
                    if(renamedLogin) Sessions(connection,transaction,input.userId,false);
                }
                else if(input.action=="soft_delete")
                {
                    if(deleted) throw new ApiFailure(409,"already_deleted");
                    using(SqlCommand command=new SqlCommand("UPDATE auth.Users SET IsActive=0,DeletedUtc=SYSUTCDATETIME(),UpdatedUtc=SYSUTCDATETIME() WHERE UserId=@id",connection,transaction))
                    {command.Parameters.Add("@id",SqlDbType.Int).Value=input.userId;command.ExecuteNonQuery();}
                    Sessions(connection,transaction,input.userId,false);
                }
                else
                {
                    if(!deleted||active) throw new ApiFailure(409,"soft_delete_first");
                    if(!String.Equals(input.confirmationLogin,oldLogin,StringComparison.Ordinal)) throw new ApiFailure(400,"confirmation_login_mismatch");
                    using(SqlCommand command=new SqlCommand("SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID(N'notes')",connection,transaction))
                        if((int)command.ExecuteScalar()!=0) throw new ApiFailure(409,"vault_cleanup_not_implemented");
                    Sessions(connection,transaction,input.userId,true);
                    using(SqlCommand command=new SqlCommand("DELETE FROM auth.Users WHERE UserId=@id",connection,transaction))
                    {command.Parameters.Add("@id",SqlDbType.Int).Value=input.userId;command.ExecuteNonQuery();}
                }
                transaction.Commit();
            }
            WebApi.Reply(context,200,new {ok=true,action=input.action,userId=input.userId,sessionsRevoked=renamedLogin||input.action!="rename"});
        }
        public void ProcessRequest(HttpContext context)
        {
            try
            {
                WebApi.Prepare(context);
                bool write=context.Request.HttpMethod=="POST";
                if(write) WebApi.Post(context);else WebApi.Method(context,"GET");
                ApiUser actor=WebApi.RequireUser(context,write);
                if(!actor.IsAdmin) throw new ApiFailure(403,"administrator_required");
                if(write) Mutate(context,actor);else List(context);
            }
            catch(SqlException exception)
            {
                if(exception.Number==2601||exception.Number==2627) WebApi.Error(context,new ApiFailure(409,"login_exists"));
                else if(exception.Number==547) WebApi.Error(context,new ApiFailure(409,"user_has_dependencies"));
                else WebApi.Error(context,exception);
            }
            catch(Exception exception){WebApi.Error(context,exception);}
        }
    }
}
