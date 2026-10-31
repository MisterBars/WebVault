import '../../src/WebVault.Web/assets/js/file_tree_data.js';

export async function prepareBenchmarkTreeData(notes,{signal,check=()=>{}}={}){
 const folders=new Map([['',{files:[],folders:[]}]]),seen=new Set();
 function guard(){if(signal?.aborted)throw Error('cancelled');check();}
 guard();if(!Array.isArray(notes)||notes.length>300)throw Error('invalid_tree_fixture');
 for(const note of notes){
  const path=note?.path;
  if(typeof path!=='string'||!path.startsWith('Bench/')||path.length>180||path.includes('\\')||!/\.md$/i.test(path)||path.split('/').length>16||path.split('/').some(p=>!p||p==='.'||p==='..')||seen.has(path.toLowerCase()))throw Error('invalid_tree_fixture');
  seen.add(path.toLowerCase());const parts=path.split('/');let parent='';
  for(const part of parts.slice(0,-1)){const next=parent?parent+'/'+part:part;if(!folders.has(next)){if(folders.size>=300)throw Error('tree_folder_limit');folders.set(next,{files:[],folders:[]});folders.get(parent).folders.push(next);}parent=next;}
  folders.get(parent).files.push(path);
 }
 const api=(typeof window==='undefined'?globalThis:window).WebVaultTreeData;
 if(api?.apiVersion!==1)throw Error('tree_data_missing');
 const scope={},source=api.create({context:()=>signal?.aborted?'':scope,listFolder:async path=>{guard();requests++;const entry=folders.get(path);if(!entry){const e=Error('tree_folder_missing');e.status=404;throw e;}return entry;}});let requests=0;
 try{await source.refresh(Array.from(folders.keys()));guard();return {source,requests,folders:folders.size,files:seen.size};}
 catch(e){source.reset();if(signal?.aborted)throw Error('cancelled');throw e;}
}
