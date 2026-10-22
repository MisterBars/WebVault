const lower=s=>s.toLowerCase(),parent=p=>p.split('/').slice(0,-1).join('/'),base=p=>p.split('/').pop();
export function createResolver(paths){
 const exact=new Map(paths.map(p=>[lower(p),p])),byName=new Map();
 for(const p of paths){const n=lower(base(p));if(!byName.has(n))byName.set(n,[]);byName.get(n).push(p);}
 return (source,raw,kind='wiki')=>{
  let target=(raw||'').trim();
  if(!target||/^[a-z][a-z0-9+.-]*:/i.test(target)||target.startsWith('//'))return {status:'ignored'};
  const rooted=target.startsWith('/');let fragment='';
  try{
   if(rooted){const hash=target.indexOf('#');fragment=hash>=0?decodeURIComponent(target.slice(hash+1)):'';target=decodeURIComponent((hash>=0?target.slice(0,hash):target).slice(1));}
   else{target=decodeURIComponent(target);if(/^[a-z][a-z0-9+.-]*:/i.test(target)||target.startsWith('//'))return {status:'ignored'};const hash=target.indexOf('#');fragment=hash>=0?target.slice(hash+1):'';if(hash>=0)target=target.slice(0,hash);}
  }catch{return {status:'invalid'};}
  if(!target)return rooted?{status:'invalid'}:{status:'resolved',path:source,fragment};
  if(target.startsWith('/')||target.includes('\\')||target.split('/').some(n=>!n||n==='.'||n==='..')||/[\u0000-\u001f\u007f:?*<>"|]/.test(target))return {status:'invalid'};
  if(kind==='markdown'&&!/\.md$/i.test(target))return {status:'ignored'};
  if(kind==='wiki'&&/\.(png|jpe?g|gif|svg|webp|pdf|mp3|mp4|wav|zip)$/i.test(target))return {status:'ignored'};
  if(!/\.md$/i.test(target))target+='.md';
  if(rooted){const path=exact.get(lower(target));return path?{status:'resolved',path,fragment}:{status:'missing',path:target,target,candidates:[],fragment};}
  const relative=parent(source)?parent(source)+'/'+target:target;
  for(const candidate of [relative,target])if(exact.has(lower(candidate)))return {status:'resolved',path:exact.get(lower(candidate)),fragment};
  const candidates=target.includes('/')?paths.filter(p=>lower(p).endsWith('/'+lower(target))):(byName.get(lower(target))||[]);
  if(candidates.length===1)return {status:'resolved',path:candidates[0],fragment};
  return {status:candidates.length?'ambiguous':'missing',path:relative,target,candidates:candidates.slice(),fragment};
 };
}
