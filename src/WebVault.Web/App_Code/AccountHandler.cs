using System;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Threading;
using System.Web;
using System.Web.Caching;
namespace WebVault
{
 public sealed class AccountHandler:IHttpHandler
 {
  public sealed class Input {public string displayName{get;set;}public string rowVersion{get;set;}public string currentPassword{get;set;}public string newPassword{get;set;}public string confirmPassword{get;set;}public int userId{get;set;}public string adminPassword{get;set;}}
  private sealed class PasswordRecord{public byte[] Hash,Salt;public string Algorithm;public int Iterations,Version;public bool Admin,Required,Locked;}
  private static readonly SemaphoreSlim Slot=new SemaphoreSlim(1,1);private static readonly object RateLock=new object();
  public bool IsReusable{get{return false;}}
  private static void P(SqlCommand q,string name,SqlDbType type,object value,int size=0){SqlParameter p=size>0?q.Parameters.Add(name,type,size):q.Parameters.Add(name,type);p.Value=value??DBNull.Value;}
  private static byte[] RowVersion(string value){byte[] bytes;try{bytes=Convert.FromBase64String(value??"");}catch(FormatException){throw new ApiFailure(400,"invalid_row_version");}if(bytes.Length!=8)throw new ApiFailure(400,"invalid_row_version");return bytes;}
  private static PasswordRecord Load(SqlConnection db,SqlTransaction tx,ApiUser user)
  {
   using(SqlCommand q=new SqlCommand(@"SELECT u.PasswordHash,u.PasswordSalt,u.PasswordAlgorithm,u.PasswordIterations,u.PasswordVersion,u.IsAdmin,u.MustChangePassword,
CASE WHEN u.LockoutUntilUtc>SYSUTCDATETIME() THEN 1 ELSE 0 END FROM auth.Users u WITH(UPDLOCK,HOLDLOCK)
WHERE u.UserId=@id AND u.IsActive=1 AND u.DeletedUtc IS NULL AND EXISTS(SELECT 1 FROM auth.UserSessions WITH(UPDLOCK,HOLDLOCK)
WHERE SessionId=@session AND UserId=@id AND RevokedUtc IS NULL AND ExpiresUtc>SYSUTCDATETIME() AND AbsoluteExpiresUtc>SYSUTCDATETIME())",db,tx))
   {P(q,"@id",SqlDbType.Int,user.UserId);P(q,"@session",SqlDbType.BigInt,user.SessionId);using(SqlDataReader r=q.ExecuteReader()){if(!r.Read())throw new ApiFailure(401,"unauthenticated");return new PasswordRecord{Hash=(byte[])r[0],Salt=(byte[])r[1],Algorithm=r.GetString(2),Iterations=r.GetInt32(3),Version=r.GetInt16(4),Admin=r.GetBoolean(5),Required=r.GetBoolean(6),Locked=r.GetInt32(7)==1};}}
  }
  private static bool Verify(PasswordRecord r,string password){return r.Algorithm==AuthCrypto.Algorithm&&r.Version==1&&AuthCrypto.Equal(AuthCrypto.Password(password,r.Salt,r.Iterations),r.Hash);}
  private static void Rate(int id){lock(RateLock){string key="WebVault.AccountSecurity:"+id;object previous=HttpRuntime.Cache[key];int count=previous==null?0:(int)previous;if(count>=5)throw new ApiFailure(429,"account_security_rate_limited");HttpRuntime.Cache.Insert(key,count+1,null,DateTime.UtcNow.AddMinutes(10),Cache.NoSlidingExpiration);}}
  private static void Revoke(SqlConnection db,SqlTransaction tx,int id,long keep=0)
  {using(SqlCommand q=new SqlCommand("UPDATE auth.UserSessions SET RevokedUtc=SYSUTCDATETIME() WHERE UserId=@id AND SessionId<>@keep AND RevokedUtc IS NULL",db,tx)){P(q,"@id",SqlDbType.Int,id);P(q,"@keep",SqlDbType.BigInt,keep);q.ExecuteNonQuery();}}
  private static void SetCookies(HttpContext c,string token,string csrf)
  {string[] names={"WebVaultSession","WebVaultCsrf"};string[] values={token,csrf};for(int i=0;i<names.Length;i++){HttpCookie cookie=new HttpCookie(names[i],values[i]);cookie.Path=String.IsNullOrEmpty(c.Request.ApplicationPath)?"/":c.Request.ApplicationPath;cookie.HttpOnly=true;cookie.Secure=c.Request.IsSecureConnection;c.Response.Cookies.Set(cookie);}}
  private static void Me(HttpContext c)
  {
   WebApi.Method(c,"GET");ApiUser u=WebApi.RequireUser(c,false,true);string csrf=WebApi.CookieToken(c,"WebVaultCsrf");if(!AuthCrypto.Equal(AuthCrypto.Hash(csrf),u.CsrfHash))throw new ApiFailure(403,"csrf_rejected");
   using(SqlConnection db=WebApi.Open())using(SqlCommand q=new SqlCommand(@"UPDATE s SET LastSeenUtc=SYSUTCDATETIME(),ExpiresUtc=CASE WHEN DATEADD(minute,30,SYSUTCDATETIME())<s.AbsoluteExpiresUtc
THEN DATEADD(minute,30,SYSUTCDATETIME()) ELSE s.AbsoluteExpiresUtc END FROM auth.UserSessions s JOIN auth.Users u ON u.UserId=s.UserId
WHERE s.SessionId=@session AND u.UserId=@id AND u.IsActive=1 AND u.DeletedUtc IS NULL AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME() AND s.AbsoluteExpiresUtc>SYSUTCDATETIME()",db))
   {P(q,"@session",SqlDbType.BigInt,u.SessionId);P(q,"@id",SqlDbType.Int,u.UserId);if(q.ExecuteNonQuery()!=1)throw new ApiFailure(401,"unauthenticated");}
   WebApi.Reply(c,200,new{ok=true,user=new{id=u.UserId,login=u.Login,displayName=u.DisplayName,isAdmin=u.IsAdmin,mustChangePassword=u.MustChangePassword,rowVersion=Convert.ToBase64String(u.RowVersion)},csrfToken=csrf});
  }
  private static void Profile(HttpContext c,ApiUser user,Input input)
  {
   string name=(input.displayName??"").Trim();if(name.Length==0||name.Length>100)throw new ApiFailure(400,"invalid_display_name");foreach(char ch in name)if(Char.IsControl(ch))throw new ApiFailure(400,"invalid_display_name");byte[] version=RowVersion(input.rowVersion);
   using(SqlConnection db=WebApi.Open())using(SqlTransaction tx=db.BeginTransaction())
   {
    if(Load(db,tx,user).Required)throw new ApiFailure(403,"password_change_required");
    using(SqlCommand q=new SqlCommand("UPDATE auth.Users SET DisplayName=@name,UpdatedUtc=SYSUTCDATETIME() WHERE UserId=@id AND RowVersion=@version AND IsActive=1 AND DeletedUtc IS NULL AND MustChangePassword=0",db,tx))
    {P(q,"@name",SqlDbType.NVarChar,name,100);P(q,"@id",SqlDbType.Int,user.UserId);P(q,"@version",SqlDbType.Binary,version,8);if(q.ExecuteNonQuery()!=1)throw new ApiFailure(409,"profile_changed_reload");}
    Revoke(db,tx,user.UserId,user.SessionId);tx.Commit();
   }
   WebApi.Reply(c,200,new{ok=true,displayName=name,currentSessionPreserved=true,otherSessionsRevoked=true});
  }
  private static void Password(HttpContext c,ApiUser user,Input input,bool reset)
  {
   string proof=reset?input.adminPassword:input.currentPassword;if(proof==null||proof.Length==0||proof.Length>128)throw new ApiFailure(400,"invalid_current_password_length");
   if(input.newPassword==null||input.newPassword.Length<15||input.newPassword.Length>128)throw new ApiFailure(400,"invalid_new_password_length");
   if(!String.Equals(input.newPassword,input.confirmPassword,StringComparison.Ordinal))throw new ApiFailure(400,"passwords_do_not_match");
   if(!reset&&String.Equals(input.newPassword,proof,StringComparison.Ordinal))throw new ApiFailure(400,"new_password_must_differ");
   if(reset&&(!user.IsAdmin||input.userId==user.UserId||input.userId<=0))throw new ApiFailure(403,"administrator_reset_forbidden");
   byte[] version=reset?RowVersion(input.rowVersion):null;Rate(user.UserId);if(!Slot.Wait(0))throw new ApiFailure(429,"server_busy");
   string sessionToken=reset?null:AuthCrypto.Token(),csrfToken=reset?null:AuthCrypto.Token();
   try
   {
    using(SqlConnection db=WebApi.Open())using(SqlTransaction tx=db.BeginTransaction())
    {
     PasswordRecord actor=Load(db,tx,user);if(reset&&(!actor.Admin||actor.Required||actor.Locked))throw new ApiFailure(403,"admin_reauthentication_failed");
     if(!Verify(actor,proof))throw new ApiFailure(403,reset?"admin_reauthentication_failed":"current_password_incorrect");int target=reset?input.userId:user.UserId;
     if(reset)using(SqlCommand q=new SqlCommand("SELECT IsAdmin,IsActive,DeletedUtc,RowVersion FROM auth.Users WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@id",db,tx))
     {P(q,"@id",SqlDbType.Int,target);using(SqlDataReader r=q.ExecuteReader()){if(!r.Read())throw new ApiFailure(404,"user_not_found");if(r.GetBoolean(0)||!r.GetBoolean(1)||!r.IsDBNull(2))throw new ApiFailure(409,"user_not_resettable");if(!AuthCrypto.Equal(version,(byte[])r[3]))throw new ApiFailure(409,"user_changed_reload_list");}}
     byte[] salt=AuthCrypto.Random(32),hash=AuthCrypto.Password(input.newPassword,salt,AuthCrypto.Iterations);
     using(SqlCommand q=new SqlCommand(@"UPDATE auth.Users SET PasswordHash=@hash,PasswordSalt=@salt,PasswordAlgorithm=@algorithm,PasswordIterations=@iterations,PasswordVersion=1,
MustChangePassword=@required,PasswordChangedUtc=SYSUTCDATETIME(),UpdatedUtc=SYSUTCDATETIME(),FailedLoginCount=0,LockoutUntilUtc=NULL
WHERE UserId=@target AND IsActive=1 AND DeletedUtc IS NULL AND EXISTS(SELECT 1 FROM auth.UserSessions WHERE SessionId=@session AND UserId=@actor
AND RevokedUtc IS NULL AND ExpiresUtc>SYSUTCDATETIME() AND AbsoluteExpiresUtc>SYSUTCDATETIME())",db,tx))
     {P(q,"@hash",SqlDbType.VarBinary,hash,128);P(q,"@salt",SqlDbType.VarBinary,salt,64);P(q,"@algorithm",SqlDbType.VarChar,AuthCrypto.Algorithm,40);P(q,"@iterations",SqlDbType.Int,AuthCrypto.Iterations);P(q,"@required",SqlDbType.Bit,reset);P(q,"@target",SqlDbType.Int,target);P(q,"@session",SqlDbType.BigInt,user.SessionId);P(q,"@actor",SqlDbType.Int,user.UserId);if(q.ExecuteNonQuery()!=1)throw new ApiFailure(401,"unauthenticated");}
     if(reset)
     {
      Revoke(db,tx,target);
      using(SqlCommand q=new SqlCommand("INSERT auth.PasswordResetEvents(ActorUserId,TargetUserId) VALUES(@actor,@target)",db,tx)){P(q,"@actor",SqlDbType.Int,user.UserId);P(q,"@target",SqlDbType.Int,target);q.ExecuteNonQuery();}
     }
     else
     {
      using(SqlCommand q=new SqlCommand(@"UPDATE auth.UserSessions SET TokenHash=@token,CsrfTokenHash=@csrf,LastSeenUtc=SYSUTCDATETIME()
WHERE SessionId=@session AND UserId=@user AND RevokedUtc IS NULL AND ExpiresUtc>SYSUTCDATETIME() AND AbsoluteExpiresUtc>SYSUTCDATETIME()",db,tx))
      {P(q,"@token",SqlDbType.Binary,AuthCrypto.Hash(sessionToken),32);P(q,"@csrf",SqlDbType.Binary,AuthCrypto.Hash(csrfToken),32);P(q,"@session",SqlDbType.BigInt,user.SessionId);P(q,"@user",SqlDbType.Int,user.UserId);if(q.ExecuteNonQuery()!=1)throw new ApiFailure(401,"unauthenticated");}
      Revoke(db,tx,target,user.SessionId);
     }
     tx.Commit();
    }
    if(!reset)SetCookies(c,sessionToken,csrfToken);WebApi.Reply(c,200,new{ok=true,mustChangePassword=reset,reauthenticationRequired=false});
   }finally{Slot.Release();}
  }
  public void ProcessRequest(HttpContext c)
  {
   try
   {
    WebApi.Prepare(c);string action=Path.GetFileNameWithoutExtension(c.Request.Path).ToLowerInvariant();if(action=="me"){Me(c);return;}
    WebApi.Post(c);if(action!="profile"&&action!="change_password"&&action!="reset_password")throw new ApiFailure(404,"not_found");
    ApiUser user=WebApi.RequireUser(c,true,action=="change_password");if(action=="reset_password"&&!user.IsAdmin)throw new ApiFailure(403,"administrator_required");Input input=WebApi.Read<Input>(c);
    if(action=="profile")Profile(c,user,input);else Password(c,user,input,action=="reset_password");
   }catch(Exception exception){WebApi.Error(c,exception);}
  }
 }
}
