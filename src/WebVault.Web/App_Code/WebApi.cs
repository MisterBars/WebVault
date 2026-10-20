using System;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Web;
using System.Web.Script.Serialization;
namespace WebVault
{
    public sealed class ApiFailure:Exception
    {public int Status;public string Code;public ApiFailure(int status,string code){Status=status;Code=code;}}
    public sealed class ApiUser
    {public int UserId;public long SessionId;public bool IsAdmin;public bool MustChangePassword;public string Login;public string DisplayName;public byte[] RowVersion;public byte[] CsrfHash;}
    public static class WebApi
    {
        public static SqlConnection Open()
        {
            ConnectionStringSettings settings=ConfigurationManager.ConnectionStrings["WebVault"];
            if(settings==null)throw new ConfigurationErrorsException("Missing WebVault connection.");
            SqlConnection connection=new SqlConnection(settings.ConnectionString);
            try{connection.Open();return connection;}catch{connection.Dispose();throw;}
        }
        public static void Prepare(HttpContext c)
        {
            c.Response.ContentType="application/json";c.Response.ContentEncoding=System.Text.Encoding.UTF8;
            c.Response.Cache.SetCacheability(HttpCacheability.NoCache);c.Response.Cache.SetNoStore();
            c.Response.TrySkipIisCustomErrors=true;c.Response.SuppressFormsAuthenticationRedirect=true;
            c.Response.AppendHeader("X-Content-Type-Options","nosniff");
            if(!c.Request.IsSecureConnection&&!c.Request.IsLocal)throw new ApiFailure(403,"https_required");
        }
        public static void Reply(HttpContext c,int status,object value){c.Response.StatusCode=status;c.Response.Write(new JavaScriptSerializer().Serialize(value));}
        public static void Method(HttpContext c,string method)
        {if(c.Request.HttpMethod!=method){c.Response.AppendHeader("Allow",method);throw new ApiFailure(405,"method_not_allowed");}}
        public static void Post(HttpContext c)
        {
            Method(c,"POST");
            if(c.Request.Headers["X-WebVault-Request"]!="1")throw new ApiFailure(403,"request_header_required");
            if(!String.Equals((c.Request.ContentType??"").Split(';')[0].Trim(),"application/json",StringComparison.OrdinalIgnoreCase))throw new ApiFailure(415,"json_required");
            string origin=c.Request.Headers["Origin"];
            if(!String.IsNullOrEmpty(origin)&&!String.Equals(origin,c.Request.Url.GetLeftPart(UriPartial.Authority),StringComparison.OrdinalIgnoreCase))throw new ApiFailure(403,"origin_rejected");
        }
        public static T Read<T>(HttpContext c) where T:class
        {
            if(c.Request.ContentLength>4096)throw new ApiFailure(413,"request_too_large");
            using(StreamReader reader=new StreamReader(c.Request.InputStream,System.Text.Encoding.UTF8))
            {
                char[] buffer=new char[4097];int count=0,read;
                while(count<buffer.Length&&(read=reader.Read(buffer,count,buffer.Length-count))>0)count+=read;
                if(count>4096)throw new ApiFailure(413,"request_too_large");T value;
                try{value=new JavaScriptSerializer().Deserialize<T>(new string(buffer,0,count));}
                catch(ArgumentException){throw new ApiFailure(400,"invalid_json");}
                catch(InvalidOperationException){throw new ApiFailure(400,"invalid_json");}
                if(value==null)throw new ApiFailure(400,"invalid_json");return value;
            }
        }
        public static string CookieToken(HttpContext c,string name)
        {
            HttpCookie cookie=c.Request.Cookies[name];string token=cookie==null?null:cookie.Value;
            if(token==null||token.Length!=44)throw new ApiFailure(401,"unauthenticated");
            try{if(Convert.FromBase64String(token).Length!=32)throw new FormatException();}
            catch(FormatException){throw new ApiFailure(401,"unauthenticated");}return token;
        }
        public static ApiUser RequireUser(HttpContext c,bool write,bool allowPasswordChange=false)
        {
            string token=CookieToken(c,"WebVaultSession");
            using(SqlConnection connection=Open())
            using(SqlCommand command=new SqlCommand(@"SELECT s.SessionId,u.UserId,u.IsAdmin,s.CsrfTokenHash,u.MustChangePassword,u.Login,u.DisplayName,u.RowVersion
FROM auth.UserSessions s JOIN auth.Users u ON u.UserId=s.UserId
WHERE s.TokenHash=@hash AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME()
AND s.AbsoluteExpiresUtc>SYSUTCDATETIME() AND u.IsActive=1 AND u.DeletedUtc IS NULL",connection))
            {
                command.Parameters.Add("@hash",SqlDbType.Binary,32).Value=AuthCrypto.Hash(token);
                using(SqlDataReader reader=command.ExecuteReader())
                {
                    if(!reader.Read())throw new ApiFailure(401,"unauthenticated");byte[] expected=(byte[])reader[3];
                    if(write)
                    {
                        string csrf=CookieToken(c,"WebVaultCsrf"),header=c.Request.Headers["X-CSRF-Token"];
                        if(header==null||header.Length!=44||!AuthCrypto.Equal(AuthCrypto.Hash(csrf),expected)||!AuthCrypto.Equal(AuthCrypto.Hash(header),expected))throw new ApiFailure(403,"csrf_rejected");
                    }
                    bool required=reader.GetBoolean(4);if(required&&!allowPasswordChange)throw new ApiFailure(403,"password_change_required");
                    return new ApiUser{SessionId=reader.GetInt64(0),UserId=reader.GetInt32(1),IsAdmin=reader.GetBoolean(2),CsrfHash=expected,MustChangePassword=required,Login=reader.GetString(5),DisplayName=reader.GetString(6),RowVersion=(byte[])reader[7]};
                }
            }
        }
        public static void Error(HttpContext c,Exception exception)
        {
            ApiFailure failure=exception as ApiFailure;if(failure!=null){Reply(c,failure.Status,new{ok=false,error=failure.Code});return;}
            string id=Guid.NewGuid().ToString("N");System.Diagnostics.Trace.TraceError("WebVault API error {0}: {1}",id,exception.GetType().FullName);
            Reply(c,500,new{ok=false,error="server_error",errorId=id});
        }
    }
}
