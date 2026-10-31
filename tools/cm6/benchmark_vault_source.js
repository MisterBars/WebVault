export function createBenchmarkVaultSource(notes,{signal,check=()=>{},pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),readable=true}={}){
 const folders=new Map([['',{files:[],folders:[]}]]),keys=new Map([['','']]),files=new Map(),seen=new Set();let disposed=false,lists=0,reads=0,bytes=0;
 const encoder=new TextEncoder();
 function guard(){if(disposed)throw Error('synthetic_source_disposed');if(signal?.aborted)throw Error('cancelled');check();}
 guard();if(!Array.isArray(notes)||notes.length>300)throw Error('invalid_tree_fixture');
 for(const note of notes){
  const path=note?.path;
  if(typeof path!=='string'||!path.startsWith('Bench/')||path.length>180||path.includes('\\')||!/\.md$/i.test(path)||path.split('/').length>16||path.split('/').some(p=>!p||p==='.'||p==='..')||seen.has(path.toLowerCase()))throw Error('invalid_tree_fixture');
  seen.add(path.toLowerCase());const parts=path.split('/');let parent='';
  for(const part of parts.slice(0,-1)){const next=parent?parent+'/'+part:part,key=next.toLowerCase();if(keys.has(key)&&keys.get(key)!==next)throw Error('invalid_tree_fixture');if(!folders.has(next)){if(folders.size>=300)throw Error('tree_folder_limit');keys.set(key,next);folders.set(next,{files:[],folders:[]});folders.get(parent).folders.push(next);}parent=next;}
  folders.get(parent).files.push(path);files.set(path,readable?{text:note.text,version:note.version}:null);
 }
 notes=null;
 function missing(){const error=Error('synthetic_path_missing');error.status=404;throw error;}
 return {async listFolder(path){guard();const entry=folders.get(path);if(!entry)missing();lists++;return {hasVault:true,folder:path,files:entry.files.slice(),folders:entry.folders.slice()};},async readNote(path){guard();if(!readable)throw Error('synthetic_read_disabled');const note=files.get(path);if(!note)missing();if(typeof note.text!=='string'||typeof note.version!=='string')throw Error('invalid_fixture_note');if((reads+1)%8===0)await pause(0);guard();reads++;bytes+=encoder.encode(note.text).length;return {name:path,text:note.text,version:note.version};},folderPaths(){guard();return Array.from(folders.keys());},snapshot(){return {disposed,folders:folders.size,files:files.size,lists,reads,bytes,readYieldEvery:8};},dispose(){disposed=true;folders.clear();keys.clear();files.clear();seen.clear();}};
}
