<%@ WebHandler Language="C#" Class="WebVaultHealthHandler" %>
using System;
using System.Configuration;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Web;
using System.Web.Script.Serialization;

public class WebVaultHealthHandler : IHttpHandler
{
    public bool IsReusable { get { return false; } }

    public void ProcessRequest(HttpContext context)
    {
        context.Response.ContentType = "application/json";
        context.Response.ContentEncoding = System.Text.Encoding.UTF8;
        context.Response.Cache.SetCacheability(HttpCacheability.NoCache);
        context.Response.Cache.SetNoStore();
        context.Response.TrySkipIisCustomErrors = true;
        context.Response.AppendHeader("X-Content-Type-Options", "nosniff");
        JavaScriptSerializer json = new JavaScriptSerializer();
        if (!context.Request.IsLocal)
        {
            context.Response.StatusCode = 403;
            context.Response.Write(json.Serialize(new { ok = false, error = "local_only" }));
            return;
        }
        if (context.Request.HttpMethod != "GET")
        {
            context.Response.StatusCode = 405;
            context.Response.AppendHeader("Allow", "GET");
            context.Response.Write(json.Serialize(new { ok = false, error = "method_not_allowed" }));
            return;
        }
        bool checkDatabase = context.Request.QueryString["check"] == "db";
        if (!checkDatabase)
        {
            context.Response.Write(json.Serialize(new { ok = true, application = "WebVault", aspnet = "ok", database = "not_checked" }));
            return;
        }
        try
        {
            ConnectionStringSettings settings = ConfigurationManager.ConnectionStrings["WebVault"];
            if (settings == null || String.IsNullOrWhiteSpace(settings.ConnectionString))
                throw new ConfigurationErrorsException("Missing WebVault connection string.");
            using (SqlConnection connection = new SqlConnection(settings.ConnectionString))
            using (SqlCommand command = new SqlCommand("SELECT DB_NAME()", connection))
            {
                command.CommandTimeout = 5;
                connection.Open();
                string database = Convert.ToString(command.ExecuteScalar());
                if (!String.Equals(database, "WebVault", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("Unexpected database.");
            }
            context.Response.Write(json.Serialize(new { ok = true, aspnet = "ok", database = "ok" }));
        }
        catch (Exception exception)
        {
            string errorId = Guid.NewGuid().ToString("N");
            Trace.TraceError("WebVault health error {0}: {1}", errorId, exception.GetType().FullName);
            context.Response.StatusCode = 503;
            context.Response.Write(json.Serialize(new { ok = false, aspnet = "ok", database = "error", error = "database_check_failed", errorId = errorId }));
        }
    }
}
