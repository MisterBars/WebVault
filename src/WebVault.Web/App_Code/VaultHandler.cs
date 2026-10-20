using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Script.Serialization;
namespace WebVault
{
    public sealed class VaultHandler:IHttpHandler
    {
        private const int MaxBytes=262144;
        private static readonly UTF8Encoding Utf8=new UTF8Encoding(false,true);
        public sealed class Input {public string action{get;set;} public string name{get;set;} public string text{get;set;} public string version{get;set;}}
        public bool IsReusable{get{return false;}}
        private static Input Read(HttpContext context)
        {
            const int limit=1048576;
            if(context.Request.ContentLength>limit) throw new ApiFailure(413,"request_too_large");
            using(StreamReader reader=new StreamReader(context.Request.InputStream,Encoding.UTF8))
            {
                char[] chars=new char[limit+1];int count=0,read;
                while(count<chars.Length&&(read=reader.Read(chars,count,chars.Length-count))>0) count+=read;
                if(count>limit) throw new ApiFailure(413,"request_too_large");
                try
                {
                    JavaScriptSerializer json=new JavaScriptSerializer();json.MaxJsonLength=limit;
                    Input input=json.Deserialize<Input>(new string(chars,0,count));
                    if(input==null) throw new ApiFailure(400,"invalid_json");return input;
                }
                catch(ArgumentException){throw new ApiFailure(400,"invalid_json");}
                catch(InvalidOperationException){throw new ApiFailure(400,"invalid_json");}
            }
        }
        private static void PlainDirectory(string path)
        {
            DirectoryInfo directory=new DirectoryInfo(path);
            if(!directory.Exists) throw new ApiFailure(409,"data_directory_missing");
            while(directory!=null)
            {
                if((directory.Attributes&FileAttributes.ReparsePoint)!=0) throw new ApiFailure(409,"reparse_point_not_allowed");
                directory=directory.Parent;
            }
        }
        private static string Root(HttpContext context)
        {
            string configured=ConfigurationManager.AppSettings["DataRoot"];
            if(String.IsNullOrWhiteSpace(configured)||!Regex.IsMatch(configured,@"\A[A-Za-z]:[\\/]")) throw new ApiFailure(409,"data_root_not_configured");
            string root=Path.GetFullPath(configured).TrimEnd('\\','/');
            string site=Path.GetFullPath(context.Server.MapPath("~/")).TrimEnd('\\','/');
            if(root.Length<4||root.Length>100||root.Equals(site,StringComparison.OrdinalIgnoreCase)||root.StartsWith(site+"\\",StringComparison.OrdinalIgnoreCase)||site.StartsWith(root+"\\",StringComparison.OrdinalIgnoreCase)) throw new ApiFailure(409,"data_root_must_be_outside_site");
            PlainDirectory(root);PlainDirectory(Path.Combine(root,"vaults"));PlainDirectory(Path.Combine(root,"history"));return root;
        }
        private static string Note(string directory,string name)
        {
            if(String.IsNullOrEmpty(name)||name.Length>100||name!=name.Trim()||name.StartsWith(".")||name.IndexOfAny(Path.GetInvalidFileNameChars())>=0||name.IndexOf('\\')>=0||name.IndexOf('/')>=0||!name.EndsWith(".md",StringComparison.OrdinalIgnoreCase)) throw new ApiFailure(400,"invalid_note_name");
            foreach(char ch in name) if(Char.IsControl(ch)) throw new ApiFailure(400,"invalid_note_name");
            string stem=name.Split('.')[0];
            if(Regex.IsMatch(stem,@"\A(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9]|CONIN\$|CONOUT\$)\z",RegexOptions.IgnoreCase)) throw new ApiFailure(400,"invalid_note_name");
            string path=Path.Combine(directory,name);
            if(path.Length>240) throw new ApiFailure(400,"path_too_long");
            if(File.Exists(path)&&(File.GetAttributes(path)&FileAttributes.ReparsePoint)!=0) throw new ApiFailure(409,"reparse_point_not_allowed");
            if(Directory.Exists(path)) throw new ApiFailure(409,"name_is_directory");return path;
        }
        private static byte[] Bytes(string path)
        {
            using(FileStream stream=new FileStream(path,FileMode.Open,FileAccess.Read,FileShare.Read))
            {
                if(stream.Length>MaxBytes) throw new ApiFailure(413,"note_too_large");
                byte[] bytes=new byte[(int)stream.Length];int count=0,read;
                while(count<bytes.Length&&(read=stream.Read(bytes,count,bytes.Length-count))>0) count+=read;
                if(count!=bytes.Length) throw new IOException("Incomplete note read.");return bytes;
            }
        }
        private static bool Bom(byte[] bytes){return bytes.Length>=3&&bytes[0]==239&&bytes[1]==187&&bytes[2]==191;}
        private static string Text(byte[] bytes){int skip=Bom(bytes)?3:0;return Utf8.GetString(bytes,skip,bytes.Length-skip);}
        private static string Version(byte[] bytes){using(SHA256 sha=SHA256.Create()) return BitConverter.ToString(sha.ComputeHash(bytes)).Replace("-","").ToLowerInvariant();}
        private static string Newlines(string text){return text.Replace("\r\n","\n").Replace("\r","\n");}
        private static void Guard(SqlConnection connection,SqlTransaction transaction,ApiUser user)
        {
            using(SqlCommand command=new SqlCommand(@"SELECT u.UserId FROM auth.Users u WITH(UPDLOCK,HOLDLOCK)
JOIN auth.UserSessions s WITH(UPDLOCK,HOLDLOCK) ON s.UserId=u.UserId
WHERE u.UserId=@id AND u.IsAdmin=0 AND u.IsActive=1 AND u.DeletedUtc IS NULL
AND s.SessionId=@session AND s.RevokedUtc IS NULL AND s.ExpiresUtc>SYSUTCDATETIME() AND s.AbsoluteExpiresUtc>SYSUTCDATETIME()",connection,transaction))
            {
                command.Parameters.Add("@id",SqlDbType.Int).Value=user.UserId;command.Parameters.Add("@session",SqlDbType.BigInt).Value=user.SessionId;
                if(command.ExecuteScalar()==null) throw new ApiFailure(401,"unauthenticated");
            }
        }
        private static object Execute(HttpContext context,ApiUser user,Input input)
        {
            string root=Root(context);object result;
            using(SqlConnection connection=WebApi.Open())
            using(SqlTransaction transaction=connection.BeginTransaction())
            {
                Guard(connection,transaction,user);
                Guid? vault=null;
                using(SqlCommand command=new SqlCommand("SELECT VaultId FROM storage.UserVaults WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@id",connection,transaction))
                {command.Parameters.Add("@id",SqlDbType.Int).Value=user.UserId;object value=command.ExecuteScalar();if(value!=null) vault=(Guid)value;}
                if(input.action=="init"&&!vault.HasValue)
                {
                    vault=Guid.NewGuid();string id=vault.Value.ToString("N");
                    string folder=Path.Combine(root,"vaults",id),history=Path.Combine(root,"history",id);
                    if(Directory.Exists(folder)||Directory.Exists(history)) throw new ApiFailure(409,"vault_directory_collision");
                    Directory.CreateDirectory(folder);Directory.CreateDirectory(history);
                    using(SqlCommand command=new SqlCommand("INSERT storage.UserVaults(VaultId,UserId) VALUES(@vault,@user)",connection,transaction))
                    {command.Parameters.Add("@vault",SqlDbType.UniqueIdentifier).Value=vault.Value;command.Parameters.Add("@user",SqlDbType.Int).Value=user.UserId;command.ExecuteNonQuery();}
                }
                if(!vault.HasValue)
                {
                    if(input.action!="list") throw new ApiFailure(409,"vault_not_initialized");
                    result=new {ok=true,hasVault=false,files=new string[0]};
                }
                else
                {
                    string id=vault.Value.ToString("N"),folder=Path.Combine(root,"vaults",id),history=Path.Combine(root,"history",id);
                    PlainDirectory(folder);PlainDirectory(history);
                    if(input.action=="list"||input.action=="init")
                    {
                        List<string> files=new List<string>();
                        foreach(string file in Directory.EnumerateFiles(folder,"*.md",SearchOption.TopDirectoryOnly))
                        {
                            string name=Path.GetFileName(file);if(name.StartsWith(".")||(File.GetAttributes(file)&FileAttributes.ReparsePoint)!=0) continue;
                            if(files.Count>=500) throw new ApiFailure(409,"too_many_notes_in_root");files.Add(name);
                        }
                        files.Sort(StringComparer.OrdinalIgnoreCase);result=new {ok=true,hasVault=true,files=files};
                    }
                    else
                    {
                        string path=Note(folder,input.name);
                        if(input.action=="create")
                        {
                            if(File.Exists(path)) throw new ApiFailure(409,"note_exists");
                            using(FileStream stream=new FileStream(path,FileMode.CreateNew,FileAccess.Write,FileShare.None)){}
                            result=new {ok=true,name=input.name,text="",version=Version(new byte[0])};
                        }
                        else if(input.action=="read")
                        {
                            byte[] bytes=Bytes(path);result=new {ok=true,name=input.name,text=Text(bytes),version=Version(bytes)};
                        }
                        else
                        {
                            if(input.text==null||input.text.Length>131072) throw new ApiFailure(413,"note_too_large");
                            byte[] previous=Bytes(path);
                            if(!String.Equals(input.version,Version(previous),StringComparison.Ordinal)) throw new ApiFailure(409,"note_changed_reload_or_copy");
                            string old=Text(previous),text=Newlines(input.text);byte[] output=previous;
                            if(Newlines(old)!=text)
                            {
                                bool crlf=old.Contains("\r\n")&&!old.Replace("\r\n","").Contains("\n");
                                if(crlf) text=text.Replace("\n","\r\n");
                                byte[] payload=Utf8.GetBytes(text);int skip=Bom(previous)?3:0;
                                if(payload.Length+skip>MaxBytes) throw new ApiFailure(413,"note_too_large");
                                output=new byte[payload.Length+skip];if(skip==3){output[0]=239;output[1]=187;output[2]=191;}Buffer.BlockCopy(payload,0,output,skip,payload.Length);
                                string temporary=Path.Combine(folder,".wv-"+Guid.NewGuid().ToString("N")+".tmp");
                                try
                                {
                                    using(FileStream stream=new FileStream(temporary,FileMode.CreateNew,FileAccess.Write,FileShare.None)){stream.Write(output,0,output.Length);stream.Flush(true);}
                                    File.Replace(temporary,path,Path.Combine(history,Guid.NewGuid().ToString("N")+".md"));
                                }
                                finally{if(File.Exists(temporary)) File.Delete(temporary);}
                            }
                            result=new {ok=true,name=input.name,version=Version(output)};
                        }
                    }
                }
                transaction.Commit();
            }
            return result;
        }
        public void ProcessRequest(HttpContext context)
        {
            try
            {
                WebApi.Prepare(context);bool write=context.Request.HttpMethod=="POST";
                if(write) WebApi.Post(context);else WebApi.Method(context,"GET");
                ApiUser user=WebApi.RequireUser(context,write);if(user.IsAdmin) throw new ApiFailure(403,"personal_account_required");
                Input input=write?Read(context):new Input{action=context.Request.QueryString["action"]??"list",name=context.Request.QueryString["name"]};
                bool allowed=write?(input.action=="init"||input.action=="create"||input.action=="save"):(input.action=="list"||input.action=="read");
                if(!allowed) throw new ApiFailure(400,"invalid_action");WebApi.Reply(context,200,Execute(context,user,input));
            }
            catch(FileNotFoundException){WebApi.Error(context,new ApiFailure(404,"note_not_found"));}
            catch(DecoderFallbackException){WebApi.Error(context,new ApiFailure(415,"note_must_be_utf8"));}
            catch(EncoderFallbackException){WebApi.Error(context,new ApiFailure(400,"invalid_text_encoding"));}
            catch(UnauthorizedAccessException){WebApi.Error(context,new ApiFailure(403,"storage_access_denied"));}
            catch(Exception exception){WebApi.Error(context,exception);}
        }
    }
}
