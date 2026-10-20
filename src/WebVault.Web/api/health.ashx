<%@ WebHandler Language="C#" Class="WebVaultHealthHandler" %>
using System;
using System.Data.SqlClient;
using System.Web;
using WebVault;
public sealed class WebVaultHealthHandler:IHttpHandler
{
    public bool IsReusable{get{return false;}}
    public void ProcessRequest(HttpContext context)
    {
        try
        {
            WebApi.Prepare(context);WebApi.Method(context,"GET");
            ApiUser user=WebApi.RequireUser(context,false);
            if(!user.IsAdmin) throw new ApiFailure(403,"administrator_required");
            if(!context.Request.IsLocal) throw new ApiFailure(403,"local_only");
            if(context.Request.QueryString["check"]!="db")
            {WebApi.Reply(context,200,new{ok=true,application="WebVault",aspnet="ok",database="not_checked"});return;}
            using(SqlConnection connection=WebApi.Open())
            using(SqlCommand command=new SqlCommand("SELECT DB_NAME()",connection))
            {command.CommandTimeout=5;if(!String.Equals(Convert.ToString(command.ExecuteScalar()),"WebVault",StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Unexpected database.");}
            WebApi.Reply(context,200,new{ok=true,aspnet="ok",database="ok"});
        }
        catch(ApiFailure failure){WebApi.Error(context,failure);}
        catch(Exception exception)
        {
            string id=Guid.NewGuid().ToString("N");
            System.Diagnostics.Trace.TraceError("WebVault health error {0}: {1}",id,exception.GetType().FullName);
            WebApi.Reply(context,503,new{ok=false,error="database_check_failed",errorId=id});
        }
    }
}
