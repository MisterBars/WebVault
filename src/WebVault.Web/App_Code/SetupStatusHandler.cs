using System;
using System.Configuration;
using System.Data.SqlClient;
using System.Web;
namespace WebVault
{
    public sealed class SetupStatusHandler:IHttpHandler
    {
        public bool IsReusable{get{return false;}}
        public void ProcessRequest(HttpContext context)
        {
            try
            {
                WebApi.Prepare(context);WebApi.Method(context,"GET");
                bool available=false;
                if(context.Request.IsLocal && ConfigurationManager.AppSettings["AdminSetupEnabled"]=="true" && (ConfigurationManager.AppSettings["AdminSetupKey"]??"").Length>=40)
                {
                    using(SqlConnection connection=WebApi.Open())
                    using(SqlCommand command=new SqlCommand("SELECT CASE WHEN EXISTS(SELECT 1 FROM auth.Users) THEN 0 ELSE 1 END",connection))
                        available=(int)command.ExecuteScalar()==1;
                }
                WebApi.Reply(context,200,new {ok=true,canSetup=available});
            }
            catch(Exception exception){WebApi.Error(context,exception);}
        }
    }
}
