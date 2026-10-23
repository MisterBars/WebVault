import {buildWikiLink,canonicalWikiTarget} from './wiki_link_model.js';
function escaped(value,at){let n=0;for(let p=at-1;p>=0&&value[p]==='\\';p--)n++;return n%2===1||value[at-1]==='!';}
export function hasPropertyWiki(value){for(let i=value.indexOf('[[');i>=0;i=value.indexOf('[[',i+2))if(!escaped(value,i))return true;return false;}
export function propertyWikiDraft(value,pos=value.length){
 if(!Number.isInteger(pos)||pos<0||pos>value.length)return null;
 const lineStart=value.lastIndexOf('\n',Math.max(0,pos-1))+1,open=value.lastIndexOf('[[',pos);
 if(open<lineStart||open+2>pos||escaped(value,open))return null;
 const endLine=value.indexOf('\n',open),limit=endLine<0?value.length:endLine;
 const close=value.indexOf(']]',open+2),complete=close>=0&&close<=limit;
 if(complete&&pos>close+2)return null;
 const end=complete?close:limit,pipe=value.indexOf('|',open+2),hasAlias=pipe>=0&&pipe<end;
 const targetEnd=hasAlias?pipe:end,target=value.slice(open+2,targetEnd),inAlias=hasAlias&&pos>pipe;
 let to=complete?close+2:pos;
 if(!complete&&hasAlias)to=limit;else if(!complete&&value[pos]===']')to=pos+(value[pos+1]===']'?2:1);
 const query=value.slice(open+2,Math.min(pos,targetEnd));
 return {open,to,complete,inAlias,target,query,alias:hasAlias?value.slice(pipe+1,end):undefined,canSuggest:!inAlias&&(!complete||pos<=close)&&!/[\[\]\r\n#]/.test(query)};
}
export function propertyLinkDraft(value,pos,path){
 const context=propertyWikiDraft(value,pos);if(!context||!context.canSuggest)throw new Error('Поставьте курсор в адрес ссылки до символа |.');
 const link=buildWikiLink(path,context.alias),next=value.slice(0,context.open)+link+value.slice(context.to),pipe=link.indexOf('|');
 const start=pipe<0?context.open+link.length:context.open+pipe+1,end=pipe<0?start:context.open+link.length-2;
 return {value:next,selectionStart:start,selectionEnd:end,open:context.open,target:canonicalWikiTarget(path)};
}
export function validatePropertyLinks(value){
 for(let i=value.indexOf('[[');i>=0;){
  if(escaped(value,i)){i=value.indexOf('[[',i+2);continue;}
  const close=value.indexOf(']]',i+2),line=value.indexOf('\n',i);
  if(close<0||line>=0&&close>line)throw new Error('Завершите ссылку через ]] или отмените ввод через Escape.');
  if(!value.slice(i+2,close).split('|')[0].trim())throw new Error('Выберите заметку или укажите адрес ссылки.');
  i=value.indexOf('[[',close+2);
 }
 return true;
}
export function parseWholePropertyWiki(value){
 const s=value.trim();if(!s.startsWith('[[')||!s.endsWith(']]'))return null;
 const raw=s.slice(2,-2);if(raw.includes(']]')||/[\r\n]/.test(raw))return null;
 const pipe=raw.indexOf('|'),target=(pipe<0?raw:raw.slice(0,pipe)).trim();if(!target)return null;
 return {target,label:pipe<0?target:raw.slice(pipe+1).trim()||target};
}
export function propertyLinkChoices(paths,query,sourcePath='',limit=30){
 const normal=value=>value.toLowerCase().replace(/ё/g,'е');
 let text=query.trim().replace(/^\//,'');try{text=decodeURIComponent(text);}catch{}
 const needle=normal(text),words=needle.split(/\s+/).filter(Boolean),folder=sourcePath.split('/').slice(0,-1).join('/');
 return [...new Set(paths)].map(path=>{
  const name=path.split('/').pop().replace(/\.md$/i,''),full=normal(path),base=normal(name);
  const match=words.every(word=>full.includes(word));
  const rank=base===needle?0:base.startsWith(needle)?1:full.startsWith(needle)?2:3;
  return {path,name,match,rank,near:folder&&path.startsWith(folder+'/')?0:1};
 }).filter(x=>x.match).sort((a,b)=>a.rank-b.rank||a.near-b.near||a.path.localeCompare(b.path)).slice(0,limit);
}
