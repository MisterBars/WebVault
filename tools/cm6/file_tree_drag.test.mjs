import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../src/WebVault.Web/assets/js/file_tree_drag.js',import.meta.url),'utf8');
class Node{
 constructor(doc,parent=null,path=null){this.ownerDocument=doc;this.parentElement=parent;this.path=path;this.listeners={};this.classes=new Set();this.classList={add:x=>this.classes.add(x),remove:x=>this.classes.delete(x)};}
 contains(n){return !!n&&(n===this||this.contains(n.parentElement));}
 closest(){return this.path!==null?this:this.parentElement?.closest();}getAttribute(){return this.path;}
 addEventListener(type,fn,capture){(this.listeners[type]??=[]).push({fn,capture});}removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(x=>x.fn!==fn);}
}
function fixture(){
 const context={},doc=new Node(null),win=new Node(null);doc.defaultView=win;const area=new Node(doc),folder=new Node(doc,area,'Bench'),nested=new Node(doc,folder,'Bench/Sub'),file=new Node(doc,folder),space=new Node(doc,folder),outside=new Node(doc);let scope='user|csrf',drag={context:scope,nonce:'nonce',items:[]},allow=true,expanded=false,next=0;const timers=new Map(),trace=[];
 vm.runInNewContext(source,context);
 const api=context.WebVaultTreeDrag.create({root:area,getDrag:()=>drag,context:()=>scope,allowed:()=>allow,isExpanded:()=>expanded,expand:(p,d,n,valid)=>trace.push(['expand',p,valid()]),drop:p=>trace.push(['drop',p]),onEnd:()=>{drag=null;},onPoint:()=>trace.push(['point']),onError:e=>trace.push(['error',e.message]),setTimer:(fn,ms)=>{trace.push(['delay',ms]);timers.set(++next,fn);return next;},clearTimer:id=>timers.delete(id)});
 function event(target,nonce='nonce'){return {target,clientX:1,clientY:2,dataTransfer:{getData:()=>nonce},preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};}
 function emit(type,e){for(const x of area.listeners[type]||[])x.fn(e);}
 async function fire(){const tasks=[...timers.values()];timers.clear();tasks.forEach(fn=>fn());await Promise.resolve();await Promise.resolve();}
 return {api,area,folder,nested,file,space,outside,doc,win,timers,trace,event,emit,fire,setScope:x=>scope=x,setDrag:x=>drag=x,setAllow:x=>allow=x,setExpanded:x=>expanded=x};
}
test('stable hover schedules one expansion and does not restart on repeated dragover',async()=>{const f=fixture();f.emit('dragover',f.event(f.folder));f.emit('dragover',f.event(f.space));assert.equal(f.timers.size,1);assert.deepEqual(f.trace.filter(x=>x[0]==='delay'),[['delay',600]]);await f.fire();assert.deepEqual(f.trace.filter(x=>x[0]==='expand'),[['expand','Bench',true]]);});
test('changing to nested folder cancels the parent timer and picks the nearest folder',async()=>{const f=fixture();f.emit('dragover',f.event(f.folder));f.emit('dragover',f.event(f.nested));assert.equal(f.timers.size,1);await f.fire();assert.deepEqual(f.trace.filter(x=>x[0]==='expand'),[['expand','Bench/Sub',true]]);});
test('drop on whitespace and a file targets its containing folder exactly once',()=>{for(const name of ['space','file']){const f=fixture(),e=f.event(f[name]);f.emit('dragover',e);f.emit('drop',e);assert.deepEqual(f.trace.filter(x=>x[0]==='drop'),[['drop','Bench']]);assert.equal(e.stopped,true);assert.equal(f.timers.size,0);}});
test('drop on empty tree space targets root rather than the previous hover',()=>{const f=fixture();f.emit('dragover',f.event(f.nested));f.emit('drop',f.event(f.area));assert.deepEqual(f.trace.filter(x=>x[0]==='drop'),[['drop','']]);});
test('leaving the tree cancels timer and feedback',async()=>{const f=fixture();f.emit('dragover',f.event(f.folder));f.emit('dragleave',{relatedTarget:f.outside});await f.fire();assert.equal(f.trace.some(x=>x[0]==='expand'),false);assert.equal(f.folder.classes.size,0);assert.equal(f.area.classes.size,0);});
test('a changed session invalidates hover and prevents drop',async()=>{const f=fixture();f.emit('dragover',f.event(f.folder));f.setScope('other|csrf');await f.fire();f.emit('drop',f.event(f.folder));assert.equal(f.trace.some(x=>x[0]==='expand'||x[0]==='drop'),false);});
test('forbidden targets and mismatched nonce never invoke move',async()=>{const f=fixture();f.setAllow(false);f.emit('dragover',f.event(f.folder));await f.fire();f.emit('drop',f.event(f.folder));assert.equal(f.trace.some(x=>x[0]==='drop'||x[0]==='expand'),false);const g=fixture();g.emit('drop',g.event(g.folder,'other'));assert.equal(g.trace.some(x=>x[0]==='drop'),false);});
test('already expanded folders never start a timer',()=>{const f=fixture();f.setExpanded(true);f.emit('dragover',f.event(f.folder));assert.equal(f.timers.size,0);});
test('pointer hit testing rejects a target that scrolled out from under the pointer',async()=>{const f=fixture();f.doc.elementFromPoint=()=>f.folder;f.emit('dragover',f.event(f.folder));f.doc.elementFromPoint=()=>f.nested;await f.fire();assert.equal(f.trace.some(x=>x[0]==='expand'),false);});
test('dragend, blur and disposal cancel timer and disposal removes listeners',async()=>{for(const kind of ['dragend','blur','dispose']){const f=fixture();f.emit('dragover',f.event(f.folder));if(kind==='dispose')f.api.dispose();else{const target=kind==='blur'?f.win:f.doc;for(const x of target.listeners[kind])x.fn({});}await f.fire();assert.equal(f.trace.some(x=>x[0]==='expand'),false);if(kind==='dispose')assert.ok(Object.values(f.area.listeners).every(x=>x.length===0));}});
test('external drops do not invoke file operations',()=>{const f=fixture();f.setDrag(null);const e=f.event(f.folder);f.emit('drop',e);assert.equal(e.prevented,true);assert.equal(f.trace.some(x=>x[0]==='drop'),false);});

test('a queued timer callback is harmless after explicit cancellation',async()=>{const f=fixture();f.emit('dragover',f.event(f.folder));const callback=[...f.timers.values()][0];f.api.cancel();callback();await Promise.resolve();await Promise.resolve();assert.equal(f.trace.some(x=>x[0]==='expand'),false);});

const workingSource=readFileSync(new URL('../../src/WebVault.Web/assets/js/file_tree.js',import.meta.url),'utf8'),viewSource=readFileSync(new URL('../../src/WebVault.Web/assets/js/file_tree_view.js',import.meta.url),'utf8');
class Element{
 constructor(doc){this.ownerDocument=doc;this.children=[];this.attrs={};this.dataset={};this.className='';this.classList={contains:c=>this.className.split(' ').includes(c)};}
 appendChild(n){if(n.parentNode)n.parentNode.children=n.parentNode.children.filter(x=>x!==n);n.parentNode=this;this.children.push(n);return n;}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]??null;}
 contains(n){return n===this||this.children.some(x=>x.contains(n));}
 querySelectorAll(selector){return this.children.flatMap(x=>[...((selector==='[data-wv-tree-folder]'?Object.hasOwn(x.attrs,'data-wv-tree-folder'):x.attrs.role==='treeitem')?[x]:[]),...x.querySelectorAll(selector)]);}
}
function expansion({late=false}={}){
 const document={createElement:()=>new Element(document),createDocumentFragment:()=>new Element(document)},context={};vm.runInNewContext(viewSource,context);const api=context.WebVaultFileTreeView,R=new Element(document),cache={'':{folders:['Folder'],files:['Source.md']},Folder:{folders:[],files:['Folder/Child.md']}},expanded={'':true},drag={context:'1|csrf'},S={user:{id:1},csrf:'csrf'};let current=true,paints=0,release;
 function decorate(row,p,k,level){if(k==='folder')row.setAttribute('data-wv-tree-folder',p);api.createButton(row,p,k,level,false,!!expanded[p]);}
 const options={container:R,getListing:p=>cache[p],isExpanded:p=>!!expanded[p],renderRow:decorate};api.renderTree(options);
 const row=R.querySelectorAll('[data-wv-tree-folder]').find(n=>n.getAttribute('data-wv-tree-folder')==='Folder'),source=R.querySelectorAll('[role=treeitem]').find(n=>n.dataset.path==='Source.md'),header=row.children[0];
 const a=workingSource.indexOf('function openDropFolder('),b=workingSource.indexOf('function installDropController(',a);assert.ok(a>=0&&b>a);
 if(late)delete cache.Folder;
 const box={window:{WebVaultFileTreeView:api},document,R,cache,expanded,drag,S,edit:null,A:{isBusy:()=>false},ready:()=>true,treeRenderOptions:options,base:p=>p.split('/').pop(),paint:()=>paints++,load:()=>new Promise(resolve=>release=()=>{cache.Folder={folders:[],files:['Folder/Child.md']};resolve();})};
 vm.runInNewContext(workingSource.slice(a,b)+';globalThis.open=openDropFolder;',box);
 return {R,row,source,header,expanded,open:()=>box.open('Folder',drag,row,()=>current),invalidate:()=>current=false,release:()=>release?.(),get paints(){return paints;}};
}
test('actual hover expansion preserves the original dragged element and target header',async()=>{const f=expansion();await f.open();assert.equal(f.R.contains(f.source),true);assert.equal(f.row.children[0],f.header);assert.equal(f.header.getAttribute('aria-expanded'),'true');assert.equal(f.expanded.Folder,true);assert.equal(f.paints,1);assert.equal(f.row.querySelectorAll('[role=treeitem]').some(x=>x.dataset.path==='Folder/Child.md'),true);});
test('late folder listing cannot expand after pointer or session invalidation',async()=>{const f=expansion({late:true}),task=f.open();f.invalidate();f.release();await task;assert.equal(f.expanded.Folder,undefined);assert.equal(f.row.children.length,1);assert.equal(f.R.contains(f.source),true);});

function binding(){let options;const tasks=[],moves=[],S={user:{id:1},csrf:'csrf'},box={dropController:null,window:{WebVaultTreeDrag:{create:o=>{options=o;return {};}}},R:{},drag:{},S,edit:null,ready:()=>true,A:{isBusy:()=>false,run:fn=>tasks.push(fn)},inside:(p,q)=>p===q||p.startsWith(q+'/'),expanded:{},openDropFolder(){},stopDrag(){},batch:(action,items,path)=>moves.push({action,items,path})};const a=workingSource.indexOf('function installDropController('),b=workingSource.indexOf('var dragView=',a);assert.ok(a>=0&&b>a);vm.runInNewContext(workingSource.slice(a,b)+';installDropController();',box);return {options,S,tasks,moves};}
test('actual binding forbids a folder itself and its descendants but permits root',()=>{const f=binding(),drag={owner:1,items:[{kind:'folder',path:'Folder'}]};assert.equal(f.options.allowed('Folder',drag),false);assert.equal(f.options.allowed('Folder/Sub',drag),false);assert.equal(f.options.allowed('',drag),true);assert.equal(f.options.allowed('Elsewhere',{...drag,owner:2}),false);});
test('actual move callback rechecks the session before starting the existing batch',()=>{const f=binding(),drag={owner:1,context:'1|csrf',items:[{kind:'file',path:'A.md'}]};f.options.drop('Folder',drag);f.S.csrf='changed';assert.throws(()=>f.tasks[0](),/Контекст перемещения устарел/);assert.equal(f.moves.length,0);const g=binding();g.options.drop('Folder',drag);g.tasks[0]();assert.equal(g.moves.length,1);assert.equal(g.moves[0].action,'move');assert.equal(g.moves[0].path,'Folder');});
