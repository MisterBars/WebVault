using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Web;
namespace WebVault {
 public sealed class BenchmarkHandler:IHttpHandler {
  sealed class Run {public string Id;public int User;public long Session;public Guid Grant;public DateTime End,NextAllowed;public int Next,Count,Size;public volatile bool Cancelled;public readonly object Gate=new object();}
  static readonly object Gate=new object();static readonly Dictionary<string,Run> Runs=new Dictionary<string,Run>();
  public bool IsReusable{get{return false;}}
  static int Number(Dictionary<string,object> p,string key,int min,int max){object v;if(!p.TryGetValue(key,out v)||!(v is int)||(int)v<min||(int)v>max)throw new ApiFailure(400,"invalid_parameter");return (int)v;}
  static string Text(Dictionary<string,object> p,string key){object v;if(!p.TryGetValue(key,out v)||!(v is string))throw new ApiFailure(400,"invalid_parameter");return (string)v;}
  static void Schema(){using(SqlConnection db=WebApi.Open())using(SqlCommand q=new SqlCommand("SELECT COL_LENGTH(N'auth.Users',N'BenchmarkGrant')",db))if(q.ExecuteScalar()==DBNull.Value)throw new ApiFailure(503,"benchmark_schema_required");}
  static Guid Permission(ApiUser user){
   if(user.IsAdmin)throw new ApiFailure(403,"ordinary_account_required");
   using(SqlConnection db=WebApi.Open())using(SqlCommand q=new SqlCommand(@"SELECT u.BenchmarkGrant FROM auth.Users u JOIN auth.UserSessions s ON u.UserId=s.UserId WHERE u.UserId=@u AND s.SessionId=@s AND u.IsActive=1 AND u.DeletedUtc IS NULL AND u.IsAdmin=0 AND u.MustChangePassword=0 AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME() AND s.AbsoluteExpiresUtc>SYSUTCDATETIME()",db)){
    q.Parameters.Add("@u",SqlDbType.Int).Value=user.UserId;q.Parameters.Add("@s",SqlDbType.BigInt).Value=user.SessionId;object v=q.ExecuteScalar();if(v==null||v==DBNull.Value)throw new ApiFailure(403,"benchmark_permission_required");return (Guid)v;
   }
  }
  static void Grant(ApiUser actor,Dictionary<string,object> p){
   if(!actor.IsAdmin)throw new ApiFailure(403,"administrator_required");int id=Number(p,"userId",1,Int32.MaxValue);object enabled;if(!p.TryGetValue("enabled",out enabled)||!(enabled is bool))throw new ApiFailure(400,"invalid_parameter");
   byte[] version;try{version=Convert.FromBase64String(Text(p,"rowVersion"));}catch(FormatException){throw new ApiFailure(400,"invalid_row_version");}if(version.Length!=8)throw new ApiFailure(400,"invalid_row_version");
   using(SqlConnection db=WebApi.Open())using(SqlTransaction tx=db.BeginTransaction()){
    using(SqlCommand q=new SqlCommand(@"SELECT u.UserId FROM auth.Users u WITH(UPDLOCK,HOLDLOCK) JOIN auth.UserSessions s WITH(UPDLOCK,HOLDLOCK) ON s.UserId=u.UserId WHERE u.UserId=@u AND s.SessionId=@s AND u.IsAdmin=1 AND u.IsActive=1 AND u.DeletedUtc IS NULL AND u.MustChangePassword=0 AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME() AND s.AbsoluteExpiresUtc>SYSUTCDATETIME()",db,tx)){
     q.Parameters.Add("@u",SqlDbType.Int).Value=actor.UserId;q.Parameters.Add("@s",SqlDbType.BigInt).Value=actor.SessionId;if(q.ExecuteScalar()==null)throw new ApiFailure(403,"administrator_required");
    }
    using(SqlCommand q=new SqlCommand("UPDATE auth.Users SET BenchmarkGrant=@g WHERE UserId=@u AND IsAdmin=0 AND (@enabled=0 OR (IsActive=1 AND DeletedUtc IS NULL AND MustChangePassword=0)) AND RowVersion=@v",db,tx)){
     q.Parameters.Add("@g",SqlDbType.UniqueIdentifier).Value=(bool)enabled?(object)Guid.NewGuid():DBNull.Value;q.Parameters.Add("@enabled",SqlDbType.Bit).Value=(bool)enabled;q.Parameters.Add("@u",SqlDbType.Int).Value=id;q.Parameters.Add("@v",SqlDbType.Binary,8).Value=version;if(q.ExecuteNonQuery()!=1)throw new ApiFailure(409,"user_changed_or_unavailable");
    }tx.Commit();
   }
   // SQL generation is authoritative. Do not cancel runs created after this commit.
  }
  static Run Owned(ApiUser user,Dictionary<string,object> p){string id=Text(p,"runId");if(id.Length!=32)throw new ApiFailure(404,"benchmark_run_not_found");lock(Gate){Run r;if(!Runs.TryGetValue(id,out r)||r.User!=user.UserId||r.Session!=user.SessionId)throw new ApiFailure(404,"benchmark_run_not_found");return r;}}
  static void Current(ApiUser user,Run r){if(r.Cancelled||DateTime.UtcNow>=r.End)throw new ApiFailure(409,"benchmark_run_closed");if(Permission(user)!=r.Grant)throw new ApiFailure(403,"benchmark_permission_changed");}
  public void ProcessRequest(HttpContext c){
   try{
    WebApi.Prepare(c);WebApi.Post(c);ApiUser user=WebApi.RequireUser(c,true);Dictionary<string,object> p=WebApi.Read<Dictionary<string,object>>(c);string action=Text(p,"action");
    string[] allowed=action=="grant"?new[]{"action","userId","enabled","rowVersion"}:action=="start"?new[]{"action","repetitions","warmup","sizeKiB"}:action=="step"?new[]{"action","runId","index"}:action=="cancel"?new[]{"action","runId"}:new[]{"action"};foreach(string k in p.Keys)if(Array.IndexOf(allowed,k)<0)throw new ApiFailure(400,"unknown_parameter");
    if(action=="cancel"){
     Run r=Owned(user,p);lock(r.Gate){r.Cancelled=true;}lock(Gate){Runs.Remove(r.Id);}WebApi.Reply(c,200,new{ok=true});return;
    }
    Schema();
    if(action=="grant"){Grant(user,p);WebApi.Reply(c,200,new{ok=true});return;}
    if(action=="status"){
     if(user.IsAdmin){WebApi.Reply(c,200,new{ok=true,canGrant=true,canRun=false});return;}
     bool can=true;try{Permission(user);}catch(ApiFailure f){if(f.Code!="benchmark_permission_required")throw;can=false;}WebApi.Reply(c,200,new{ok=true,canGrant=false,canRun=can});return;
    }
    Guid grant=Permission(user);
    if(action=="start"){
     int repetitions=Number(p,"repetitions",1,100),warmup=Number(p,"warmup",0,10),size=Number(p,"sizeKiB",1,256);Run r=new Run{Id=Guid.NewGuid().ToString("N"),User=user.UserId,Session=user.SessionId,Grant=grant,End=DateTime.UtcNow.AddMinutes(2),Count=repetitions+warmup,Size=size*1024};
     lock(Gate){if(Permission(user)!=grant)throw new ApiFailure(403,"benchmark_permission_changed");List<string> expired=new List<string>();foreach(Run old in Runs.Values){if(old.Cancelled||DateTime.UtcNow>=old.End||(old.User==user.UserId&&old.Grant!=grant))expired.Add(old.Id);else if(old.User==user.UserId)throw new ApiFailure(409,"benchmark_already_running");}foreach(string id in expired)Runs.Remove(id);if(Runs.Count>=32)throw new ApiFailure(429,"benchmark_busy");Runs.Add(r.Id,r);}
     WebApi.Reply(c,200,new{ok=true,runId=r.Id,scenario="http.synthetic.read",scenarioVersion=1,fixtureVersion=1,bytes=r.Size,count=r.Count,deadlineSeconds=120});return;
    }
    if(action=="step"){
     Run r=Owned(user,p);int index=Number(p,"index",0,109);lock(r.Gate){Current(user,r);if(DateTime.UtcNow<r.NextAllowed)throw new ApiFailure(429,"benchmark_rate_limited");if(index!=r.Next||r.Next>=r.Count)throw new ApiFailure(409,"benchmark_sequence_mismatch");r.Next++;r.NextAllowed=DateTime.UtcNow.AddMilliseconds(50);string text=new string('x',r.Size);Current(user,r);WebApi.Reply(c,200,new{ok=true,runId=r.Id,index=index,bytes=r.Size,text=text});}return;
    }
    throw new ApiFailure(400,"invalid_action");
   }catch(Exception e){WebApi.Error(c,e);}
  }
 }
}
