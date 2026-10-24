const rangeOK=value=>value&&Number.isSafeInteger(value.from)&&Number.isSafeInteger(value.to)&&value.from>=0&&value.to>value.from;
const labelOK=value=>typeof value==='string'&&value.length>0&&value.length<=128&&!/[\s\[\]\u0000-\u001f\u007f]/u.test(value);
const ordered=values=>values.map((value,inputIndex)=>({value,inputIndex})).sort((a,b)=>(rangeOK(a.value)?a.value.from:Infinity)-(rangeOK(b.value)?b.value.from:Infinity)||a.inputIndex-b.inputIndex);
export function resolveFootnotes({definitions=[],references=[],maxNotes=512,maxReferences=2048}={}){
 if(!Array.isArray(definitions)||!Array.isArray(references))throw new TypeError('Footnote events must be arrays.');
 if(!Number.isSafeInteger(maxNotes)||maxNotes<1||!Number.isSafeInteger(maxReferences)||maxReferences<1)throw new RangeError('Footnote limits must be positive safe integers.');
 const catalog=new Map(),used=new Map(),notes=[],resolved=[],diagnostics=[];
 for(const {value:d,inputIndex} of ordered(definitions)){
  if(!rangeOK(d)||!labelOK(d.label)||typeof d.body!=='string'){diagnostics.push({type:'invalid-definition',inputIndex});continue;}
  if(catalog.has(d.label)){diagnostics.push({type:'duplicate-definition',label:d.label,from:d.from,to:d.to});continue;}
  catalog.set(d.label,{label:d.label,body:d.body,from:d.from,to:d.to});
 }
 let lastTo=-1;
 for(const {value:r,inputIndex} of ordered(references)){
  const item={inputIndex,kind:r?.kind,from:r?.from,to:r?.to,status:'invalid'};
  if(r?.kind==='named')item.label=r.label;
  if(r?.kind==='inline')item.body=r.body;
  resolved.push(item);
  if(resolved.length>maxReferences){item.status='limit';diagnostics.push({type:'reference-limit',inputIndex});continue;}
  if(!rangeOK(r)||!['named','inline'].includes(r.kind)||r.kind==='named'&&!labelOK(r.label)||r.kind==='inline'&&(typeof r.body!=='string'||!r.body.trim())){diagnostics.push({type:'invalid-reference',inputIndex});continue;}
  if(r.from<lastTo){diagnostics.push({type:'overlapping-reference',from:r.from,to:r.to});continue;}
  lastTo=r.to;
  const definition=r.kind==='named'?catalog.get(r.label):null;
  if(r.kind==='named'&&!definition){item.status='unresolved';diagnostics.push({type:'missing-definition',label:r.label,from:r.from,to:r.to});continue;}
  const key=r.kind==='named'?'named:'+r.label:'inline:'+r.from+':'+r.to;
  let note=used.get(key);
  if(!note){
   if(notes.length>=maxNotes){item.status='limit';diagnostics.push({type:'note-limit',from:r.from,to:r.to});continue;}
   note={key,number:notes.length+1,kind:r.kind,body:definition?definition.body:r.body,definition:definition?{...definition}:null,references:[]};
   if(definition)note.label=definition.label;
   notes.push(note);used.set(key,note);
  }
  item.status='resolved';item.number=note.number;item.occurrence=note.references.length+1;item.key=key;
  note.references.push({from:r.from,to:r.to,occurrence:item.occurrence});
 }
 return {definitions:[...catalog.values()],references:resolved,notes,diagnostics};
}
