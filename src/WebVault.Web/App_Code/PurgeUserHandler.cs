using System;using System.Data;using System.Data.SqlClient;using System.Diagnostics;using System.IO;using System.Web;
namespace WebVault
{
 public sealed class PurgeUserHandler:IHttpHandler
 {
  public sealed class Input{public int userId{get;set;}public string rowVersion{get;set;}public string confirmationLogin{get;set;}public bool deleteFiles{get;set;}}
  private sealed class Job{public Guid Id;public Guid? Vault;public byte[] RootHash;public string Status;}
  public bool IsReusable{get{return false;}}
  private static void P(SqlCommand q,string name,SqlDbType type,object value,int size=0){SqlParameter p=size>0?q.Parameters.Add(name,type,size):q.Parameters.Add(name,type);p.Value=value??DBNull.Value;}
  private static void Admin(SqlConnection db,SqlTransaction tx,ApiUser user)
  {using(SqlCommand q=new SqlCommand(@"SELECT u.UserId FROM auth.Users u WITH(UPDLOCK,HOLDLOCK) WHERE u.UserId=@id AND u.IsAdmin=1 AND u.IsActive=1 AND u.DeletedUtc IS NULL AND u.MustChangePassword=0
AND EXISTS(SELECT 1 FROM auth.UserSessions WITH(UPDLOCK,HOLDLOCK) WHERE SessionId=@s AND UserId=@id AND RevokedUtc IS NULL AND ExpiresUtc>SYSUTCDATETIME() AND AbsoluteExpiresUtc>SYSUTCDATETIME())",db,tx)){P(q,"@id",SqlDbType.Int,user.UserId);P(q,"@s",SqlDbType.BigInt,user.SessionId);if(q.ExecuteScalar()==null)throw new ApiFailure(403,"administrator_required");}}
  private static Job GetJob(SqlConnection db,SqlTransaction tx,int userId)
  {using(SqlCommand q=new SqlCommand("SELECT JobId,VaultId,RootHash,Status FROM storage.PurgeJobs WITH(UPDLOCK,HOLDLOCK) WHERE TargetUserId=@id",db,tx)){P(q,"@id",SqlDbType.Int,userId);using(SqlDataReader r=q.ExecuteReader()){if(!r.Read())return null;return new Job{Id=r.GetGuid(0),Vault=r.IsDBNull(1)?(Guid?)null:r.GetGuid(1),RootHash=r.IsDBNull(2)?null:(byte[])r[2],Status=r.GetString(3)};}}}
  private static Guid? Target(SqlConnection db,SqlTransaction tx,Input input,byte[] version)
  {
   using(SqlCommand q=new SqlCommand("SELECT Login,IsAdmin,IsActive,DeletedUtc,RowVersion FROM auth.Users WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@id",db,tx)){P(q,"@id",SqlDbType.Int,input.userId);using(SqlDataReader r=q.ExecuteReader()){if(!r.Read())throw new ApiFailure(404,"user_not_found");if(r.GetBoolean(1))throw new ApiFailure(409,"cannot_manage_administrator");if(r.GetBoolean(2)||r.IsDBNull(3))throw new ApiFailure(409,"soft_delete_first");if(!String.Equals(input.confirmationLogin,r.GetString(0),StringComparison.Ordinal))throw new ApiFailure(400,"confirmation_login_mismatch");if(!AuthCrypto.Equal(version,(byte[])r[4]))throw new ApiFailure(409,"user_changed_reload_list");}}
   using(SqlCommand q=new SqlCommand("SELECT VaultId FROM storage.UserVaults WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@id",db,tx)){P(q,"@id",SqlDbType.Int,input.userId);object v=q.ExecuteScalar();return v==null?(Guid?)null:(Guid)v;}
  }
  private static void AssertSchema(SqlConnection db,SqlTransaction tx){using(SqlCommand q=new SqlCommand("storage.AssertPurgeSchema",db,tx)){q.CommandType=CommandType.StoredProcedure;q.ExecuteNonQuery();}}
  private static void Budget(Stopwatch watch){if(watch.ElapsedMilliseconds>20000)throw new ApiFailure(409,"purge_retry_required");}
  private static void Preflight(string path,int depth,ref int count,Stopwatch watch)
  {Budget(watch);if(!Directory.Exists(path)){if(File.Exists(path))throw new ApiFailure(409,"vault_directory_invalid");return;}if(depth>24||path.Length>240||++count>10000)throw new ApiFailure(409,"purge_tree_limit");VaultHandler.PlainDirectory(path);foreach(string entry in Directory.EnumerateFileSystemEntries(path)){Budget(watch);FileAttributes a=File.GetAttributes(entry);if((a&FileAttributes.ReparsePoint)!=0)throw new ApiFailure(409,"reparse_point_not_allowed");if(entry.Length>240)throw new ApiFailure(409,"purge_tree_limit");if((a&FileAttributes.Directory)!=0)Preflight(entry,depth+1,ref count,watch);else if(++count>10000)throw new ApiFailure(409,"purge_tree_limit");}}
  private static void DeleteTree(string path,Stopwatch watch)
  {Budget(watch);if(!Directory.Exists(path)){if(File.Exists(path))throw new ApiFailure(409,"vault_directory_invalid");return;}VaultHandler.PlainDirectory(path);foreach(string entry in Directory.EnumerateFileSystemEntries(path)){Budget(watch);FileAttributes a=File.GetAttributes(entry);if((a&FileAttributes.ReparsePoint)!=0)throw new ApiFailure(409,"reparse_point_not_allowed");if((a&FileAttributes.Directory)!=0)DeleteTree(entry,watch);else File.Delete(entry);}Directory.Delete(path,false);}
  private static object Execute(HttpContext c,ApiUser admin,Input input,byte[] version,ref Guid? jobId)
  {
   Job job;using(SqlConnection db=WebApi.Open())
   {
    using(SqlTransaction tx=db.BeginTransaction())
    {
     Admin(db,tx,admin);job=GetJob(db,tx,input.userId);if(job!=null&&job.Status=="Complete"){jobId=job.Id;tx.Commit();return new{ok=true,jobId=job.Id,complete=true};}
     Guid? vault=Target(db,tx,input,version);AssertSchema(db,tx);byte[] rootHash=vault.HasValue?AuthCrypto.Hash(VaultHandler.DataRoot(c).ToUpperInvariant()):null;
     if(job==null){job=new Job{Id=Guid.NewGuid(),Vault=vault,RootHash=rootHash,Status="Started"};using(SqlCommand q=new SqlCommand("INSERT storage.PurgeJobs(JobId,TargetUserId,ActorUserId,VaultId,RootHash,Status) VALUES(@job,@user,@actor,@vault,@root,'Started')",db,tx)){P(q,"@job",SqlDbType.UniqueIdentifier,job.Id);P(q,"@user",SqlDbType.Int,input.userId);P(q,"@actor",SqlDbType.Int,admin.UserId);P(q,"@vault",SqlDbType.UniqueIdentifier,vault.HasValue?(object)vault.Value:null);P(q,"@root",SqlDbType.Binary,rootHash,32);q.ExecuteNonQuery();}}
     else if(job.Vault!=vault||(vault.HasValue&&!AuthCrypto.Equal(job.RootHash,rootHash)))throw new ApiFailure(409,"purge_root_or_vault_changed");
     jobId=job.Id;tx.Commit();
    }
    using(SqlTransaction tx=db.BeginTransaction())
    {
     Admin(db,tx,admin);job=GetJob(db,tx,input.userId);if(job.Status=="Complete"){tx.Commit();return new{ok=true,jobId=job.Id,complete=true};}Guid? vault=Target(db,tx,input,version);if(job.Vault!=vault)throw new ApiFailure(409,"purge_root_or_vault_changed");AssertSchema(db,tx);
     using(SqlCommand q=new SqlCommand("UPDATE storage.PurgeJobs SET Status='Started',LastError=NULL,UpdatedUtc=SYSUTCDATETIME() WHERE JobId=@id",db,tx)){P(q,"@id",SqlDbType.UniqueIdentifier,job.Id);q.ExecuteNonQuery();}
     if(vault.HasValue){string root=VaultHandler.DataRoot(c);if(!AuthCrypto.Equal(job.RootHash,AuthCrypto.Hash(root.ToUpperInvariant())))throw new ApiFailure(409,"purge_root_or_vault_changed");string id=vault.Value.ToString("N"),files=Path.Combine(root,"vaults",id),history=Path.Combine(root,"history",id);Stopwatch watch=Stopwatch.StartNew();int count=0;Preflight(files,0,ref count,watch);Preflight(history,0,ref count,watch);DeleteTree(files,watch);DeleteTree(history,watch);}
     Admin(db,tx,admin);using(SqlCommand q=new SqlCommand(@"DELETE FROM auth.UserSessions WHERE UserId=@user;DELETE FROM storage.UserVaults WHERE UserId=@user;DELETE FROM auth.Users WHERE UserId=@user;
UPDATE storage.PurgeJobs SET Status='Complete',LastError=NULL,UpdatedUtc=SYSUTCDATETIME() WHERE JobId=@job;",db,tx)){P(q,"@user",SqlDbType.Int,input.userId);P(q,"@job",SqlDbType.UniqueIdentifier,job.Id);q.ExecuteNonQuery();}tx.Commit();
    }
   }return new{ok=true,jobId=job.Id,complete=true};
  }
  public void ProcessRequest(HttpContext c)
  {
   Guid? jobId=null;try{WebApi.Prepare(c);WebApi.Post(c);ApiUser admin=WebApi.RequireUser(c,true);if(!admin.IsAdmin)throw new ApiFailure(403,"administrator_required");Input input=WebApi.Read<Input>(c);if(input.userId<=0||input.userId==admin.UserId||!input.deleteFiles)throw new ApiFailure(400,"explicit_purge_confirmation_required");byte[] version;try{version=Convert.FromBase64String(input.rowVersion??"");}catch(FormatException){throw new ApiFailure(400,"invalid_row_version");}if(version.Length!=8)throw new ApiFailure(400,"invalid_row_version");WebApi.Reply(c,200,Execute(c,admin,input,version,ref jobId));}
   catch(Exception e){if(jobId.HasValue){try{using(SqlConnection db=WebApi.Open())using(SqlCommand q=new SqlCommand("UPDATE storage.PurgeJobs SET Status='RetryRequired',LastError=@error,UpdatedUtc=SYSUTCDATETIME() WHERE JobId=@id AND Status<>'Complete'",db)){P(q,"@error",SqlDbType.VarChar,e.GetType().Name,80);P(q,"@id",SqlDbType.UniqueIdentifier,jobId.Value);q.ExecuteNonQuery();}}catch(Exception logging){Trace.TraceError("Purge job state write failed: {0}",logging.GetType().Name);}ApiFailure failure=e as ApiFailure;WebApi.Reply(c,failure==null?503:failure.Status,new{ok=false,error=failure==null?"purge_retry_required":failure.Code,errorId=jobId.Value.ToString("N")});}else WebApi.Error(c,e);}
  }
 }
}
