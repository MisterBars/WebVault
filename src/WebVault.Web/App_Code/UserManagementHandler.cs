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
  public sealed class Change{public string action{get;set;}public int userId{get;set;}public string login{get;set;}public string displayName{get;set;}public string rowVersion{get;set;}public string confirmationLogin{get;set;}}
  public bool IsReusable{get{return false;}}
  private static void List(HttpContext c)
  {
   List<object> users=new List<object>();using(SqlConnection db=WebApi.Open())using(SqlCommand q=new SqlCommand(@"SELECT TOP(200) UserId,Login,DisplayName,IsAdmin,IsActive,CASE WHEN DeletedUtc IS NULL THEN 0 ELSE 1 END,RowVersion
FROM auth.Users WHERE @include=1 OR DeletedUtc IS NULL ORDER BY UserId",db))
   {q.Parameters.Add("@include",SqlDbType.Bit).Value=c.Request.QueryString["includeDeleted"]=="1";using(SqlDataReader r=q.ExecuteReader())while(r.Read())users.Add(new{id=r.GetInt32(0),login=r.GetString(1),displayName=r.GetString(2),isAdmin=r.GetBoolean(3),isActive=r.GetBoolean(4),isDeleted=r.GetInt32(5)==1,rowVersion=Convert.ToBase64String((byte[])r[6])});}
   WebApi.Reply(c,200,new{ok=true,users=users,limit=200});
  }
  private static void Actor(SqlConnection db,SqlTransaction tx,ApiUser actor)
  {
   using(SqlCommand q=new SqlCommand(@"SELECT u.UserId FROM auth.Users u WITH(UPDLOCK,HOLDLOCK) JOIN auth.UserSessions s WITH(UPDLOCK,HOLDLOCK) ON s.UserId=u.UserId
WHERE u.UserId=@actor AND u.IsAdmin=1 AND u.IsActive=1 AND u.DeletedUtc IS NULL AND u.MustChangePassword=0
AND s.SessionId=@session AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME() AND s.AbsoluteExpiresUtc>SYSUTCDATETIME()",db,tx))
   {q.Parameters.Add("@actor",SqlDbType.Int).Value=actor.UserId;q.Parameters.Add("@session",SqlDbType.BigInt).Value=actor.SessionId;if(q.ExecuteScalar()==null)throw new ApiFailure(403,"administrator_required");}
  }
  private static void Sessions(SqlConnection db,SqlTransaction tx,int id,bool remove)
  {using(SqlCommand q=new SqlCommand(remove?"DELETE FROM auth.UserSessions WHERE UserId=@id":"UPDATE auth.UserSessions SET RevokedUtc=SYSUTCDATETIME() WHERE UserId=@id AND RevokedUtc IS NULL",db,tx)){q.Parameters.Add("@id",SqlDbType.Int).Value=id;q.ExecuteNonQuery();}}
  private static void Mutate(HttpContext c,ApiUser actor)
  {
   Change input=WebApi.Read<Change>(c);if(input.action!="rename"&&input.action!="soft_delete"&&input.action!="purge")throw new ApiFailure(400,"invalid_action");if(input.userId<=0)throw new ApiFailure(400,"invalid_user_id");if(input.userId==actor.UserId)throw new ApiFailure(409,"cannot_manage_self");
   byte[] version;try{version=Convert.FromBase64String(input.rowVersion??"");}catch(FormatException){throw new ApiFailure(400,"invalid_row_version");}if(version.Length!=8)throw new ApiFailure(400,"invalid_row_version");
   using(SqlConnection db=WebApi.Open())using(SqlTransaction tx=db.BeginTransaction())
   {
    Actor(db,tx,actor);string oldLogin;bool deleted,active;
    using(SqlCommand q=new SqlCommand("SELECT Login,IsAdmin,IsActive,DeletedUtc,RowVersion FROM auth.Users WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@id",db,tx))
    {q.Parameters.Add("@id",SqlDbType.Int).Value=input.userId;using(SqlDataReader r=q.ExecuteReader()){if(!r.Read())throw new ApiFailure(404,"user_not_found");if(r.GetBoolean(1))throw new ApiFailure(409,"cannot_manage_administrator");if(!AuthCrypto.Equal(version,(byte[])r[4]))throw new ApiFailure(409,"user_changed_reload_list");oldLogin=r.GetString(0);active=r.GetBoolean(2);deleted=!r.IsDBNull(3);}}
    if(input.action=="rename")
    {
     if(deleted)throw new ApiFailure(409,"deleted_user_not_editable");string login=(input.login??"").Trim(),name=(input.displayName??"").Trim();if(!Regex.IsMatch(login,@"\A[A-Za-z0-9_.-]{3,64}\z"))throw new ApiFailure(400,"invalid_login");if(name.Length==0||name.Length>100)throw new ApiFailure(400,"invalid_display_name");foreach(char ch in name)if(Char.IsControl(ch))throw new ApiFailure(400,"invalid_display_name");
     using(SqlCommand q=new SqlCommand("UPDATE auth.Users SET Login=@login,NormalizedLogin=@normalized,DisplayName=@name,UpdatedUtc=SYSUTCDATETIME() WHERE UserId=@id",db,tx))
     {q.Parameters.Add("@id",SqlDbType.Int).Value=input.userId;q.Parameters.Add("@login",SqlDbType.NVarChar,64).Value=login;q.Parameters.Add("@normalized",SqlDbType.NVarChar,64).Value=login.ToUpperInvariant();q.Parameters.Add("@name",SqlDbType.NVarChar,100).Value=name;q.ExecuteNonQuery();}
     Sessions(db,tx,input.userId,false);
    }
    else if(input.action=="soft_delete")
    {if(deleted)throw new ApiFailure(409,"already_deleted");using(SqlCommand q=new SqlCommand("UPDATE auth.Users SET IsActive=0,DeletedUtc=SYSUTCDATETIME(),UpdatedUtc=SYSUTCDATETIME() WHERE UserId=@id",db,tx)){q.Parameters.Add("@id",SqlDbType.Int).Value=input.userId;q.ExecuteNonQuery();}Sessions(db,tx,input.userId,false);}
    else
    {
     if(!deleted||active)throw new ApiFailure(409,"soft_delete_first");if(!String.Equals(input.confirmationLogin,oldLogin,StringComparison.Ordinal))throw new ApiFailure(400,"confirmation_login_mismatch");using(SqlCommand q=new SqlCommand("SELECT COUNT(*) FROM sys.tables WHERE schema_id=SCHEMA_ID(N'notes')",db,tx))if((int)q.ExecuteScalar()!=0)throw new ApiFailure(409,"vault_cleanup_not_implemented");
     Sessions(db,tx,input.userId,true);using(SqlCommand q=new SqlCommand("DELETE FROM auth.Users WHERE UserId=@id",db,tx)){q.Parameters.Add("@id",SqlDbType.Int).Value=input.userId;q.ExecuteNonQuery();}
    }tx.Commit();
   }WebApi.Reply(c,200,new{ok=true,action=input.action,userId=input.userId,sessionsRevoked=true});
  }
  public void ProcessRequest(HttpContext c)
  {
   try{WebApi.Prepare(c);bool write=c.Request.HttpMethod=="POST";if(write)WebApi.Post(c);else WebApi.Method(c,"GET");ApiUser actor=WebApi.RequireUser(c,write);if(!actor.IsAdmin)throw new ApiFailure(403,"administrator_required");if(write)Mutate(c,actor);else List(c);}
   catch(SqlException e){if(e.Number==2601||e.Number==2627)WebApi.Error(c,new ApiFailure(409,"login_exists"));else if(e.Number==547)WebApi.Error(c,new ApiFailure(409,"user_has_dependencies"));else WebApi.Error(c,e);}
   catch(Exception e){WebApi.Error(c,e);}
  }
 }
}
