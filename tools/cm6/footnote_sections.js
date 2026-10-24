export function groupFootnotesBySection(notes,sections,length){
 const all=[...sections].sort((a,b)=>a.from-b.from),groups=new Map();
 for(const note of notes){const pos=note.references?.[0]?.from;if(!Number.isSafeInteger(pos))continue;let owner=null;for(const section of all)if(section.from<=pos&&pos<=section.to)owner=section;
  const key=owner?owner.from:null;if(!groups.has(key))groups.set(key,{section:owner,end:owner?owner.to:all.length?Math.max(0,all[0].from-1):length,notes:[]});groups.get(key).notes.push(note);
 }
 return [...groups.values()].sort((a,b)=>a.end-b.end||(b.section?.level||0)-(a.section?.level||0));
}
const activeFlashes=new WeakMap();
export function flashFootnoteTarget(root,target,{schedule=setTimeout,cancel=clearTimeout}={}){
 const old=activeFlashes.get(root);if(old){old.cancel(old.timer);old.node.classList.remove('wv-footnote-target');activeFlashes.delete(root);}
 const node=target.closest?.('p,li,h1,h2,h3,h4,h5,h6')||target;if(!node.classList)return;
 node.classList.add('wv-footnote-target');const flash={node,timer:null,cancel};activeFlashes.set(root,flash);
 flash.timer=schedule(()=>{if(activeFlashes.get(root)!==flash)return;node.classList.remove('wv-footnote-target');activeFlashes.delete(root);},1800);
}
