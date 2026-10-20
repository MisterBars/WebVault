using System;using System.Collections.Generic;using System.Data;using System.Data.SqlClient;using System.Diagnostics;using System.Globalization;using System.IO;using System.Text.RegularExpressions;using System.Web;using System.Web.Script.Serialization;
namespace WebVault
{
 public sealed class FileMoveHandler:IHttpHandler
 {
  public sealed class Input{public string action{get;set;}public string path{get;set;}public string destination{get;set;}public string expectedStamp{get;set;}}
  public sealed class Record{public string Id{get;set;}public string Action{get;set;}public string Source{get;set;}public string Destination{get;set;}public string State{get;set;}public string CreatedUtc{get;set;}}
  private sealed class Entry{public string Relative;public bool Directory;public long Length,Ticks;}
  public bool IsReusable{get{return false;}}
  private static string Resolve(string root,string relative)
  {
   if(String.IsNullOrEmpty(relative)||relative.Length>180||relative.IndexOf('\\')>=0)throw new ApiFailure(400,"invalid_path");string[] parts=relative.Split('/');if(parts.Length>16)throw new ApiFailure(400,"path_too_deep");string path=root;
   foreach(string p in parts){if(String.IsNullOrEmpty(p)||p.Length>100||p!=p.Trim()||p.StartsWith(".")||p.EndsWith(".")||p.IndexOfAny(Path.GetInvalidFileNameChars())>=0)throw new ApiFailure(400,"invalid_path");foreach(char ch in p)if(Char.IsControl(ch))throw new ApiFailure(400,"invalid_path");if(Regex.IsMatch(p.Split('.')[0],@"\A(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9]|CONIN\$|CONOUT\$)\z",RegexOptions.IgnoreCase))throw new ApiFailure(400,"invalid_path");path=Path.Combine(path,p);if((File.Exists(path)||Directory.Exists(path))&&(File.GetAttributes(path)&FileAttributes.ReparsePoint)!=0)throw new ApiFailure(409,"reparse_point_not_allowed");}
   path=Path.GetFullPath(path);if(path.Length>240||!path.StartsWith(root+"\\",StringComparison.OrdinalIgnoreCase))throw new ApiFailure(400,"invalid_path");return path;
  }
  private static void Scan(string path,string relative,List<Entry> entries,ref long total,Stopwatch watch)
  {
   if(watch.ElapsedMilliseconds>10000||entries.Count>=2000||path.Length>240||relative.Split('/').Length>16)throw new ApiFailure(409,"operation_tree_limit");FileAttributes a=File.GetAttributes(path);if((a&FileAttributes.ReparsePoint)!=0)throw new ApiFailure(409,"reparse_point_not_allowed");bool directory=(a&FileAttributes.Directory)!=0;long length=directory?0:new FileInfo(path).Length;total+=length;if(total>52428800)throw new ApiFailure(409,"operation_tree_limit");entries.Add(new Entry{Relative=relative,Directory=directory,Length=length,Ticks=File.GetLastWriteTimeUtc(path).Ticks});if(directory)foreach(string child in Directory.EnumerateFileSystemEntries(path))Scan(child,relative.Length==0?Path.GetFileName(child):relative+"/"+Path.GetFileName(child),entries,ref total,watch);
  }
  private static string Stamp(List<Entry> entries)
  {entries.Sort(delegate(Entry a,Entry b){return StringComparer.Ordinal.Compare(a.Relative,b.Relative);});List<string> lines=new List<string>();foreach(Entry e in entries)lines.Add((e.Directory?"D":"F")+"|"+e.Relative+"|"+e.Length.ToString(CultureInfo.InvariantCulture)+"|"+e.Ticks.ToString(CultureInfo.InvariantCulture));return Convert.ToBase64String(AuthCrypto.Hash(String.Join("\n",lines.ToArray())));}
  private static string Owned(SqlConnection db,SqlTransaction tx,ApiUser user,HttpContext c)
  {
   using(SqlCommand q=new SqlCommand(@"SELECT u.UserId FROM auth.Users u WITH(UPDLOCK,HOLDLOCK) WHERE u.UserId=@id AND u.IsActive=1 AND u.IsAdmin=0 AND u.DeletedUtc IS NULL AND u.MustChangePassword=0
AND EXISTS(SELECT 1 FROM auth.UserSessions WITH(UPDLOCK,HOLDLOCK) WHERE SessionId=@s AND UserId=@id AND RevokedUtc IS NULL AND ExpiresUtc>SYSUTCDATETIME() AND AbsoluteExpiresUtc>SYSUTCDATETIME())",db,tx)){q.Parameters.Add("@id",SqlDbType.Int).Value=user.UserId;q.Parameters.Add("@s",SqlDbType.BigInt).Value=user.SessionId;if(q.ExecuteScalar()==null)throw new ApiFailure(401,"unauthenticated");}
   Guid vault;using(SqlCommand q=new SqlCommand("SELECT VaultId FROM storage.UserVaults WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@id",db,tx)){q.Parameters.Add("@id",SqlDbType.Int).Value=user.UserId;object value=q.ExecuteScalar();if(value==null)throw new ApiFailure(409,"vault_not_initialized");vault=(Guid)value;}string root=Path.Combine(VaultHandler.DataRoot(c),"vaults",vault.ToString("N"));VaultHandler.PlainDirectory(root);return root;
  }
  private static void WriteRecord(string path,Record record)
  {string temporary=path+".tmp-"+Guid.NewGuid().ToString("N");try{byte[] bytes=new System.Text.UTF8Encoding(false).GetBytes(new JavaScriptSerializer().Serialize(record));using(FileStream s=new FileStream(temporary,FileMode.CreateNew,FileAccess.Write,FileShare.None)){s.Write(bytes,0,bytes.Length);s.Flush(true);}if(File.Exists(path))File.Replace(temporary,path,null);else File.Move(temporary,path);}finally{if(File.Exists(temporary))File.Delete(temporary);}}
  public void ProcessRequest(HttpContext c)
  {
   bool moved=false;string operationId=null;try
   {
    WebApi.Prepare(c);bool write=c.Request.HttpMethod=="POST";if(write)WebApi.Post(c);else WebApi.Method(c,"GET");ApiUser user=WebApi.RequireUser(c,write);if(user.IsAdmin)throw new ApiFailure(403,"personal_account_required");if(c.Request.Headers["X-WebVault-User"]!=user.UserId.ToString(CultureInfo.InvariantCulture))throw new ApiFailure(409,"session_changed");Input input=write?WebApi.Read<Input>(c):new Input{action=c.Request.QueryString["action"]??"stat",path=c.Request.QueryString["path"]};if(write?(input.action!="move"&&input.action!="rename"):(input.action!="stat"))throw new ApiFailure(400,"invalid_action");object result;
    using(SqlConnection db=WebApi.Open())using(SqlTransaction tx=db.BeginTransaction())
    {
     string root=Owned(db,tx,user,c),source=Resolve(root,input.path);if(!File.Exists(source)&&!Directory.Exists(source))throw new ApiFailure(404,"entry_not_found");List<Entry> entries=new List<Entry>();long bytes=0;Scan(source,"",entries,ref bytes,Stopwatch.StartNew());string stamp=Stamp(entries);bool folder=Directory.Exists(source);
     if(!write)result=new{ok=true,path=input.path,kind=folder?"folder":"file",stamp=stamp};
     else
     {
      if(!String.Equals(stamp,input.expectedStamp,StringComparison.Ordinal))throw new ApiFailure(409,"source_changed_refresh");string destination=Resolve(root,input.destination);
      if(String.Equals(source,destination,StringComparison.OrdinalIgnoreCase))throw new ApiFailure(409,"same_path_or_case_only_rename");if(folder&&destination.StartsWith(source+"\\",StringComparison.OrdinalIgnoreCase))throw new ApiFailure(409,"cannot_move_into_descendant");
      if(input.action=="rename"&&!String.Equals(Path.GetDirectoryName(source),Path.GetDirectoryName(destination),StringComparison.OrdinalIgnoreCase))throw new ApiFailure(400,"rename_must_keep_parent");
      if(File.Exists(destination)||Directory.Exists(destination))throw new ApiFailure(409,"destination_exists");if(!Directory.Exists(Path.GetDirectoryName(destination)))throw new ApiFailure(404,"destination_folder_not_found");VaultHandler.PlainDirectory(Path.GetDirectoryName(destination));
      if(!folder&&input.path.EndsWith(".md",StringComparison.OrdinalIgnoreCase)&&!input.destination.EndsWith(".md",StringComparison.OrdinalIgnoreCase))throw new ApiFailure(400,"markdown_extension_required");
      foreach(Entry e in entries){string relative=e.Relative.Length==0?input.destination:input.destination+"/"+e.Relative;string target=e.Relative.Length==0?destination:Path.Combine(destination,e.Relative.Replace('/','\\'));if(relative.Length>180||relative.Split('/').Length>16||target.Length>240)throw new ApiFailure(409,"destination_path_too_long");}
      string logs=Path.Combine(root,".wv-ops");if(!Directory.Exists(logs))Directory.CreateDirectory(logs);VaultHandler.PlainDirectory(logs);operationId=Guid.NewGuid().ToString("N");string log=Path.Combine(logs,operationId+".json");Record record=new Record{Id=operationId,Action=input.action,Source=input.path,Destination=input.destination,State="Planned",CreatedUtc=DateTime.UtcNow.ToString("o",CultureInfo.InvariantCulture)};WriteRecord(log,record);
      if(folder)Directory.Move(source,destination);else File.Move(source,destination);moved=true;record.State="Complete";WriteRecord(log,record);result=new{ok=true,action=input.action,source=input.path,destination=input.destination,kind=folder?"folder":"file",operationId=operationId};
     }tx.Commit();
    }WebApi.Reply(c,200,result);
   }catch(Exception e){if(moved){System.Diagnostics.Trace.TraceError("File move acknowledgement uncertain {0}: {1}",operationId,e.GetType().Name);WebApi.Reply(c,503,new{ok=false,error="move_result_uncertain_refresh_tree",errorId=operationId});}else if(e is FileNotFoundException||e is DirectoryNotFoundException)WebApi.Error(c,new ApiFailure(404,"entry_not_found"));else WebApi.Error(c,e);}
  }
 }
}
