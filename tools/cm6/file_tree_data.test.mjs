import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../src/WebVault.Web/assets/js/file_tree_data.js',import.meta.url),'utf8');
function fixture(listFolder=async()=>({files:['Bench/A.md'],folders:[]})){
 const root={},events=[];let context='owner-1|session-1';vm.runInNewContext(source,root);
 const store=root.WebVaultTreeData.create({listFolder,context:()=>context,onListing:(path,data)=>events.push({path,data})});
 return {root,store,events,setContext:value=>context=value};
}
const plain=value=>JSON.parse(JSON.stringify(value));
test('shared loader commits a listing and notifies its consumer',async()=>{const f=fixture(),data=await f.store.load('Bench');assert.deepEqual(plain(data),{files:['Bench/A.md'],folders:[]});assert.equal(f.store.get('Bench'),data);assert.equal(f.events[0].data,data);});
test('accepted listings are copied and missing folders normalize to empty',()=>{const f=fixture(),input={files:['A.md']};f.store.accept('',input);input.files.push('B.md');assert.deepEqual(plain(f.store.get('')),{files:['A.md'],folders:[]});});
test('late listing after session change cannot populate cache or notify',async()=>{let release;const f=fixture(()=>new Promise(r=>release=r)),task=f.store.load('');await Promise.resolve();f.setContext('owner-1|session-2');release({files:['old.md']});await assert.rejects(task,/tree_context_changed/);assert.equal(f.store.get(''),undefined);assert.equal(f.events.length,0);});
test('reset invalidates an outstanding request even for the same context',async()=>{let release;const f=fixture(()=>new Promise(r=>release=r)),task=f.store.load('');await Promise.resolve();f.store.reset();release({files:['old.md']});await assert.rejects(task,/tree_context_changed/);assert.equal(f.events.length,0);});
test('refresh lists parents first and ignores only missing folders',async()=>{const calls=[],missing=[],f=fixture(async p=>{calls.push(p);if(p==='gone'){const e=Error('missing');e.status=404;throw e;}return {files:[],folders:[]};});await f.store.refresh(['Bench/Child','gone',''],p=>missing.push(p));assert.deepEqual(calls,['','gone','Bench/Child']);assert.deepEqual(missing,['gone']);});
test('refresh stops before requesting another folder under a new session',async()=>{const calls=[];let release;const f=fixture(p=>{calls.push(p);return new Promise(r=>release=r);}),task=f.store.refresh(['','Bench']);await new Promise(r=>setTimeout(r,0));f.setContext('owner-2|session-1');release({files:[]});await assert.rejects(task,/tree_context_changed/);assert.deepEqual(calls,['']);});
test('malformed listing never replaces the previous accepted entry',async()=>{const f=fixture(async()=>({files:[42]}));f.store.accept('',{files:['safe.md']});await assert.rejects(f.store.load(''),/invalid_tree_listing/);assert.deepEqual(plain(f.store.get('')),{files:['safe.md'],folders:[]});});
test('transport errors propagate without retry',async()=>{let requests=0;const error=Error('network'),f=fixture(async()=>{requests++;throw error;});await assert.rejects(f.store.load(''),e=>e===error);assert.equal(requests,1);assert.equal(f.events.length,0);});
test('empty context performs no transport request',async()=>{let requests=0;const f=fixture(async()=>{requests++;return {files:[]};});f.setContext('');await assert.rejects(f.store.load(''),/tree_context_unavailable/);assert.equal(requests,0);});
test('reloading the same API is idempotent and conflicting API rejects',()=>{const f=fixture(),api=f.root.WebVaultTreeData;vm.runInNewContext(source,f.root);assert.equal(f.root.WebVaultTreeData,api);assert.throws(()=>vm.runInNewContext(source,{WebVaultTreeData:{apiVersion:2}}),/tree_data_version_conflict/);});

const treeSource=readFileSync(new URL('../../src/WebVault.Web/assets/js/file_tree.js',import.meta.url),'utf8');
function working({shared=true,request=async()=>({files:['Folder/A.md'],folders:[]})}={}){
 const context={};if(shared)vm.runInNewContext(source,context);
 const state={user:{id:1},csrf:'a',hasVault:true,folder:'Folder'},calls=[];
 const a=treeSource.indexOf('function listingSource(){'),b=treeSource.indexOf("['file_tree.css'",a);
 assert.ok(a>=0&&b>a);
 const c=treeSource.indexOf('function load(p){'),d=treeSource.indexOf('function setFolder(p)',c);
 assert.ok(c>=0&&d>c);
 const box={window:context,S:state,sharedSource:null,cache:Object.create(null),expanded:{'':true,Folder:true},A:{protectedApi:async(url,data)=>{calls.push({url,data});return request();}},ready:()=>!!state.user&&state.hasVault,hide(){},render(){},encodeURIComponent};
 vm.runInNewContext(treeSource.slice(a,b)+treeSource.slice(c,d)+';globalThis.functions={load,refresh,resetCache,getCache:()=>cache};',box);
 return {state,calls,functions:box.functions};
}
test('working load uses the real shared source and preserves its URL and current folder',async()=>{const f=working();await f.functions.load('Folder');assert.equal(f.calls[0].url,'api/notes/vault.ashx?action=list&folder=Folder');assert.equal(f.calls[0].data,null);assert.deepEqual(Array.from(f.state.files),['Folder/A.md']);assert.equal(f.functions.getCache().Folder.files,f.state.files);});
test('working load keeps the legacy fallback when common source is absent',async()=>{const f=working({shared:false});await f.functions.load('Folder');assert.equal(f.calls.length,1);assert.deepEqual(Array.from(f.state.files),['Folder/A.md']);});
test('working load drops late session responses through the common source',async()=>{let release;const f=working({request:()=>new Promise(r=>release=r)}),task=f.functions.load('Folder');await new Promise(r=>setTimeout(r,0));f.state.csrf='b';release({files:['old.md']});await assert.rejects(task,/tree_context_changed/);assert.equal(f.state.files,undefined);assert.equal(f.functions.getCache().Folder,undefined);});
test('working refresh commits into the same cache used by rendering',async()=>{const f=working();await f.functions.refresh();assert.equal(f.calls.length,2);assert.ok(f.functions.getCache()['']);assert.equal(f.functions.getCache().Folder.files,f.state.files);});
test('shared source is queued before row view and CM6 without changing the edit guard',()=>{assert.ok(treeSource.indexOf('document.head.appendChild(dataView)')<treeSource.indexOf('document.head.appendChild(rowView)'));assert.ok(treeSource.indexOf('document.head.appendChild(rowView)')<treeSource.indexOf('document.head.appendChild(cm)'));assert.ok(treeSource.includes('dataView.async=false'));assert.ok(treeSource.includes('if(ready()&&!edit)render()'));});
