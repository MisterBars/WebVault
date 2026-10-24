import {validNotePath} from './wiki_link_model.js';
const shared=new WeakMap();
export function createLinkCatalog(getApp,{notes=300,folders=300}={}){
 const defaultInstance=arguments.length===1,app=defaultInstance?getApp():null;
 if(defaultInstance&&shared.has(app))return shared.get(app);
 let cache=null,pending=null,epoch=0,owner=null;
 function user(){const s=getApp().state;if(!s.user||s.user.isAdmin||s.user.mustChangePassword||!s.hasVault)throw new Error('Нужно личное хранилище.');return s.user.id;}
 function invalidate(){cache=null;pending=null;epoch++;}
 async function ensure({refresh=false}={}){
  const id=user();if(owner!==id){invalidate();owner=id;}
  if(refresh&&cache)invalidate();
  if(cache)return cache;if(pending)return pending;
  const generation=epoch;
  function guard(){if(user()!==id||epoch!==generation)throw new Error('Каталог изменился. Повторите ввод ссылки.');}
  const promise=(async()=>{
   const paths=[],seen=new Set();let count=0;
   async function walk(folder){
    guard();if(seen.has(folder.toLowerCase()))return;seen.add(folder.toLowerCase());if(++count>folders)throw new Error('Каталог ссылок: превышен лимит папок.');
    const data=await getApp().protectedApi('api/notes/vault.ashx?action=list&folder='+encodeURIComponent(folder),null);guard();
    for(const path of data.files||[]){if(!validNotePath(path))continue;paths.push(path);if(paths.length>notes)throw new Error('Каталог ссылок: максимум '+notes+' заметок в этой версии.');}
    for(const next of data.folders||[])await walk(next);
   }
   await walk('');guard();
   const unique=new Map(paths.map(path=>[path.toLowerCase(),path]));
   cache={ownerId:id,generation,paths:[...unique.values()].sort((a,b)=>a.localeCompare(b))};return cache;
  })();
  pending=promise;try{return await promise;}finally{if(pending===promise)pending=null;}
 }
 function isCurrent(snapshot){try{return !!snapshot&&snapshot===cache&&snapshot.ownerId===user()&&snapshot.generation===epoch;}catch{return false;}}
 const result={ensure,invalidate,isCurrent,status:()=>({cached:!!cache,noteCount:cache?cache.paths.length:0,pending:!!pending,generation:epoch})};
 if(defaultInstance)shared.set(app,result);return result;
}
