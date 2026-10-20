using System;using System.Collections.Generic;using System.Configuration;using System.Data;using System.Data.SqlClient;using System.IO;using System.Security.Cryptography;using System.Text;using System.Text.RegularExpressions;using System.Web;using System.Web.Script.Serialization;
namespace WebVault
{
 public sealed class VaultHandler:IHttpHandler
 {
  private const int MaxBytes=262144;private static readonly UTF8Encoding Utf8=new UTF8Encoding(false,true);
  public sealed class Input{public string action{get;set;}public string name{get;set;}public string text{get;set;}public string version{get;set;}public string folder{get;set;}}
  public bool IsReusable{get{return false;}}
  private static Input Read(HttpContext c)
  {const int limit=1048576;if(c.Request.ContentLength>limit)throw new ApiFailure(413,"request_too_large");using(StreamReader r=new StreamReader(c.Request.InputStream,Encoding.UTF8)){char[] b=new char[limit+1];int n=0,k;while(n<b.Length&&(k=r.Read(b,n,b.Length-n))>0)n+=k;if(n>limit)throw new ApiFailure(413,"request_too_large");try{JavaScriptSerializer j=new JavaScriptSerializer();j.MaxJsonLength=limit;Input v=j.Deserialize<Input>(new string(b,0,n));if(v==null)throw new ApiFailure(400,"invalid_json");return v;}catch(ArgumentException){throw new ApiFailure(400,"invalid_json");}catch(InvalidOperationException){throw new ApiFailure(400,"invalid_json");}}}
  public static void PlainDirectory(string path)
  {DirectoryInfo d=new DirectoryInfo(path);if(!d.Exists)throw new ApiFailure(409,"data_directory_missing");while(d!=null){if((d.Attributes&FileAttributes.ReparsePoint)!=0)throw new ApiFailure(409,"reparse_point_not_allowed");d=d.Parent;}}
  public static string DataRoot(HttpContext c)
  {string value=ConfigurationManager.AppSettings["DataRoot"];if(String.IsNullOrWhiteSpace(value)||!Regex.IsMatch(value,@"\A[A-Za-z]:[\\/]"))throw new ApiFailure(409,"data_root_not_configured");string root=Path.GetFullPath(value).TrimEnd('\\','/'),site=Path.GetFullPath(c.Server.MapPath("~/")).TrimEnd('\\','/');if(root.Length<4||root.Length>100||root.Equals(site,StringComparison.OrdinalIgnoreCase)||root.StartsWith(site+"\\",StringComparison.OrdinalIgnoreCase)||site.StartsWith(root+"\\",StringComparison.OrdinalIgnoreCase))throw new ApiFailure(409,"data_root_must_be_outside_site");PlainDirectory(root);PlainDirectory(Path.Combine(root,"vaults"));PlainDirectory(Path.Combine(root,"history"));return root;}
  private static void Segment(string value)
  {if(String.IsNullOrEmpty(value)||value.Length>100||value!=value.Trim()||value.StartsWith(".")||value.EndsWith(".")||value.IndexOfAny(Path.GetInvalidFileNameChars())>=0)throw new ApiFailure(400,"invalid_path");foreach(char ch in value)if(Char.IsControl(ch))throw new ApiFailure(400,"invalid_path");if(Regex.IsMatch(value.Split('.')[0],@"\A(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9]|CONIN\$|CONOUT\$)\z",RegexOptions.IgnoreCase))throw new ApiFailure(400,"invalid_path");}
  private static string Resolve(string root,string relative,bool allowRoot)
  {relative=relative??"";if(relative.Length==0){if(allowRoot)return root;throw new ApiFailure(400,"invalid_path");}if(relative.Length>180||relative.IndexOf('\\')>=0)throw new ApiFailure(400,"invalid_path");string[] parts=relative.Split('/');if(parts.Length>16)throw new ApiFailure(400,"path_too_deep");string path=root;foreach(string part in parts){Segment(part);path=Path.Combine(path,part);if((File.Exists(path)||Directory.Exists(path))&&(File.GetAttributes(path)&FileAttributes.ReparsePoint)!=0)throw new ApiFailure(409,"reparse_point_not_allowed");}path=Path.GetFullPath(path);if(path.Length>240||!path.StartsWith(root+"\\",StringComparison.OrdinalIgnoreCase))throw new ApiFailure(400,"path_too_long_or_invalid");return path;}
  private static string Note(string root,string name){if(String.IsNullOrEmpty(name)||!name.EndsWith(".md",StringComparison.OrdinalIgnoreCase))throw new ApiFailure(400,"invalid_note_name");string path=Resolve(root,name,false);if(Directory.Exists(path))throw new ApiFailure(409,"name_is_directory");if(!Directory.Exists(Path.GetDirectoryName(path)))throw new ApiFailure(404,"folder_not_found");return path;}
  private static byte[] Bytes(string path){using(FileStream s=new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.Read)){if(s.Length>MaxBytes)throw new ApiFailure(413,"note_too_large");byte[] b=new byte[(int)s.Length];int n=0,k;while(n<b.Length&&(k=s.Read(b,n,b.Length-n))>0)n+=k;if(n!=b.Length)throw new IOException("Incomplete read.");return b;}}
  private static bool Bom(byte[] b){return b.Length>=3&&b[0]==239&&b[1]==187&&b[2]==191;}private static string Text(byte[] b){int skip=Bom(b)?3:0;return Utf8.GetString(b,skip,b.Length-skip);}private static string Version(byte[] b){using(SHA256 s=SHA256.Create())return BitConverter.ToString(s.ComputeHash(b)).Replace("-","").ToLowerInvariant();}private static string Lines(string s){return s.Replace("\r\n","\n").Replace("\r","\n");}
  private static object Listing(string root,string relative)
  {string dir=Resolve(root,relative,true);PlainDirectory(dir);List<string> files=new List<string>(),folders=new List<string>();int count=0;foreach(string entry in Directory.EnumerateFileSystemEntries(dir)){string name=Path.GetFileName(entry);if(name.StartsWith("."))continue;FileAttributes a=File.GetAttributes(entry);if((a&FileAttributes.ReparsePoint)!=0)continue;if(++count>500)throw new ApiFailure(409,"too_many_entries");string path=String.IsNullOrEmpty(relative)?name:relative+"/"+name;if((a&FileAttributes.Directory)!=0)folders.Add(path);else if(name.EndsWith(".md",StringComparison.OrdinalIgnoreCase))files.Add(path);}files.Sort(StringComparer.OrdinalIgnoreCase);folders.Sort(StringComparer.OrdinalIgnoreCase);return new{ok=true,hasVault=true,folder=relative??"",files=files,folders=folders};}
  private static void Guard(SqlConnection db,SqlTransaction tx,ApiUser u)
  {using(SqlCommand q=new SqlCommand(@"SELECT u.UserId FROM auth.Users u WITH(UPDLOCK,HOLDLOCK) JOIN auth.UserSessions s WITH(UPDLOCK,HOLDLOCK) ON s.UserId=u.UserId
WHERE u.UserId=@id AND u.IsAdmin=0 AND u.IsActive=1 AND u.DeletedUtc IS NULL AND u.MustChangePassword=0
AND s.SessionId=@session AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME() AND s.AbsoluteExpiresUtc>SYSUTCDATETIME()",db,tx)){q.Parameters.Add("@id",SqlDbType.Int).Value=u.UserId;q.Parameters.Add("@session",SqlDbType.BigInt).Value=u.SessionId;if(q.ExecuteScalar()==null)throw new ApiFailure(401,"unauthenticated");}}
  private static object Execute(HttpContext c,ApiUser user,Input input)
  {
   string root=DataRoot(c);object result;using(SqlConnection db=WebApi.Open())using(SqlTransaction tx=db.BeginTransaction())
   {
    Guard(db,tx,user);Guid? vault=null;using(SqlCommand q=new SqlCommand("SELECT VaultId FROM storage.UserVaults WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@id",db,tx)){q.Parameters.Add("@id",SqlDbType.Int).Value=user.UserId;object value=q.ExecuteScalar();if(value!=null)vault=(Guid)value;}
    if(input.action=="init"&&!vault.HasValue){vault=Guid.NewGuid();string id=vault.Value.ToString("N"),dir=Path.Combine(root,"vaults",id),history=Path.Combine(root,"history",id);if(Directory.Exists(dir)||Directory.Exists(history))throw new ApiFailure(409,"vault_directory_collision");Directory.CreateDirectory(dir);Directory.CreateDirectory(history);using(SqlCommand q=new SqlCommand("INSERT storage.UserVaults(VaultId,UserId) VALUES(@v,@u)",db,tx)){q.Parameters.Add("@v",SqlDbType.UniqueIdentifier).Value=vault.Value;q.Parameters.Add("@u",SqlDbType.Int).Value=user.UserId;q.ExecuteNonQuery();}}
    if(!vault.HasValue){if(input.action!="list")throw new ApiFailure(409,"vault_not_initialized");result=new{ok=true,hasVault=false,folder="",files=new string[0],folders=new string[0]};}
    else
    {
     string id=vault.Value.ToString("N"),dir=Path.Combine(root,"vaults",id),history=Path.Combine(root,"history",id);PlainDirectory(dir);PlainDirectory(history);
     if(input.action=="list"||input.action=="init")result=Listing(dir,input.action=="init"?"":input.folder??"");
     else if(input.action=="mkdir"){string path=Resolve(dir,input.name,false);if(File.Exists(path)||Directory.Exists(path))throw new ApiFailure(409,"entry_exists");if(!Directory.Exists(Path.GetDirectoryName(path)))throw new ApiFailure(404,"folder_not_found");Directory.CreateDirectory(path);result=new{ok=true,folder=input.name};}
     else
     {
      string path=Note(dir,input.name);
      if(input.action=="create"){if(File.Exists(path))throw new ApiFailure(409,"note_exists");using(FileStream s=new FileStream(path,FileMode.CreateNew,FileAccess.Write,FileShare.None)){}result=new{ok=true,name=input.name,text="",version=Version(new byte[0])};}
      else if(input.action=="read"){byte[] bytes=Bytes(path);result=new{ok=true,name=input.name,text=Text(bytes),version=Version(bytes)};}
      else
      {
       if(input.text==null||input.text.Length>131072)throw new ApiFailure(413,"note_too_large");byte[] previous=Bytes(path);if(!String.Equals(input.version,Version(previous),StringComparison.Ordinal))throw new ApiFailure(409,"note_changed_reload_or_copy");string old=Text(previous),text=Lines(input.text);byte[] output=previous;
       if(Lines(old)!=text){bool crlf=old.Contains("\r\n")&&!old.Replace("\r\n","").Contains("\n");if(crlf)text=text.Replace("\n","\r\n");byte[] payload=Utf8.GetBytes(text);int skip=Bom(previous)?3:0;if(payload.Length+skip>MaxBytes)throw new ApiFailure(413,"note_too_large");output=new byte[payload.Length+skip];if(skip==3){output[0]=239;output[1]=187;output[2]=191;}Buffer.BlockCopy(payload,0,output,skip,payload.Length);string temporary=Path.Combine(Path.GetDirectoryName(path),".wv-"+Guid.NewGuid().ToString("N")+".tmp");try{using(FileStream s=new FileStream(temporary,FileMode.CreateNew,FileAccess.Write,FileShare.None)){s.Write(output,0,output.Length);s.Flush(true);}File.Replace(temporary,path,Path.Combine(history,Guid.NewGuid().ToString("N")+".md"));}finally{if(File.Exists(temporary))File.Delete(temporary);}}result=new{ok=true,name=input.name,version=Version(output)};
      }
     }
    }tx.Commit();
   }return result;
  }
  public void ProcessRequest(HttpContext c)
  {try{WebApi.Prepare(c);bool write=c.Request.HttpMethod=="POST";if(write)WebApi.Post(c);else WebApi.Method(c,"GET");ApiUser u=WebApi.RequireUser(c,write);if(u.IsAdmin)throw new ApiFailure(403,"personal_account_required");Input input=write?Read(c):new Input{action=c.Request.QueryString["action"]??"list",name=c.Request.QueryString["name"],folder=c.Request.QueryString["folder"]};bool allowed=write?(input.action=="init"||input.action=="create"||input.action=="save"||input.action=="mkdir"):(input.action=="list"||input.action=="read");if(!allowed)throw new ApiFailure(400,"invalid_action");WebApi.Reply(c,200,Execute(c,u,input));}
   catch(FileNotFoundException){WebApi.Error(c,new ApiFailure(404,"note_not_found"));}catch(DirectoryNotFoundException){WebApi.Error(c,new ApiFailure(404,"folder_not_found"));}catch(DecoderFallbackException){WebApi.Error(c,new ApiFailure(415,"note_must_be_utf8"));}catch(EncoderFallbackException){WebApi.Error(c,new ApiFailure(400,"invalid_text_encoding"));}catch(UnauthorizedAccessException){WebApi.Error(c,new ApiFailure(403,"storage_access_denied"));}catch(Exception e){WebApi.Error(c,e);}}
 }
}
