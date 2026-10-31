const owners=new WeakMap();
export function renderBenchmarkTree({host,notes,createButton,expanded=['','Bench'],onSelect=()=>{},listings=null}){
 if(!host||!host.ownerDocument||typeof host.ownerDocument.createDocumentFragment!=='function'||!Array.isArray(notes)||notes.length>300||typeof createButton!=='function'||typeof onSelect!=='function')throw Error('invalid_tree_fixture');
 const doc=host.ownerDocument,paths=new Set(),folders=new Map([['',{folders:new Set(),files:[]}]]),opened=new Set(expanded);
 for(const note of notes){const path=note&&note.path;if(typeof path!=='string'||!path.startsWith('Bench/')||path.length>180||path.includes('\\')||!/\.md$/i.test(path)||path.split('/').length>16||path.split('/').some(p=>!p||p==='.'||p==='..')||paths.has(path.toLowerCase()))throw Error('invalid_tree_fixture');paths.add(path.toLowerCase());const parts=path.split('/');let parent='';for(const part of parts.slice(0,-1)){const p=parent?parent+'/'+part:part;if(!folders.has(p)){if(folders.size>=300)throw Error('tree_folder_limit');folders.set(p,{folders:new Set(),files:[]});}folders.get(parent).folders.add(p);parent=p;}folders.get(parent).files.push(path);}
 const token={},previous=owners.get(host);let alive=true,buttons=[],selected=null,generation=0;
 const active=()=>alive&&owners.get(host)===token;
 function render(){if(!active())return;const fragment=doc.createDocumentFragment(),next=[],revision=generation+1;
  const valid=()=>active()&&generation===revision;
  function draw(path,kind,parent,level){const row=doc.createElement('div');parent.appendChild(row);const b=createButton(row,path,kind,level,path===selected,opened.has(path),'Тестовый набор');next.push(b);
   function toggle(){if(opened.has(path))opened.delete(path);else opened.add(path);render();const current=buttons.find(x=>x.dataset.path===path);if(current)current.focus();}
   b.onclick=()=>{if(!valid())return;if(kind==='folder')toggle();else{selected=path;render();onSelect(path);}};
   b.onkeydown=e=>{if(!valid())return;const i=buttons.indexOf(b);let target=null;if(e.key==='ArrowDown')target=buttons[i+1];else if(e.key==='ArrowUp')target=buttons[i-1];else if(e.key==='Home')target=buttons[0];else if(e.key==='End')target=buttons[buttons.length-1];else if(kind==='folder'&&((e.key==='ArrowRight'&&!opened.has(path))||(e.key==='ArrowLeft'&&opened.has(path)))){e.preventDefault();toggle();return;}else return;e.preventDefault();if(target)target.focus();};
   if(kind==='folder'&&opened.has(path)){const children=doc.createElement('div');children.className='tree-children';children.setAttribute('role','group');row.appendChild(children);const data=listings?listings.get(path):folders.get(path);if(!data)throw Error('incorrect_tree_listing');for(const p of data.folders)draw(p,'folder',children,level+1);for(const p of data.files)draw(p,'file',children,level+1);}
  }
  draw('','folder',fragment,1);for(const b of buttons){b.onclick=null;b.onkeydown=null;}host.textContent='';host.setAttribute('role','tree');host.setAttribute('aria-label','Тестовое дерево');host.appendChild(fragment);buttons=next;generation=revision;
 }
 owners.set(host,token);try{render();}catch(e){alive=false;if(previous)owners.set(host,previous);else owners.delete(host);throw e;}
 return {snapshot(){return {files:paths.size,folders:folders.size,visibleRows:buttons.length,selected};},dispose(){if(!alive)return;alive=false;for(const b of buttons){b.onclick=null;b.onkeydown=null;}buttons=[];if(owners.get(host)===token){owners.delete(host);host.textContent='';}}};
}
