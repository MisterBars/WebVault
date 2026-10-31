import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {prepareBenchmarkTreeData} from './benchmark_tree_source.js';
import {renderBenchmarkTree} from './benchmark_tree.js';
import {createTreeWorkloadRunner} from './benchmark_tree_workloads.js';
const shared=readFileSync(new URL('../../src/WebVault.Web/assets/js/file_tree_view.js',import.meta.url),'utf8');
class Element{
 constructor(doc,tag){this.ownerDocument=doc;this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.isConnected=true;}
 appendChild(n){if(n.tag==='fragment'){this.children.push(...n.children);n.children=[];}else this.children.push(n);return n;}
 setAttribute(k,v){this.attrs[k]=String(v);}set textContent(v){this.children=[];}
 querySelectorAll(){return this.children.flatMap(n=>[...(n.attrs.role==='treeitem'?[n]:[]),...n.querySelectorAll()]);}
 getBoundingClientRect(){return {width:240,height:480};}focus(){}
}
function dom(){const doc={createElement:t=>new Element(doc,t),createDocumentFragment:()=>new Element(doc,'fragment')},context={};vm.runInNewContext(shared,context);return {host:new Element(doc,'host'),createButton:context.WebVaultFileTreeView.createButton};}
const notes=[{path:'Bench/A.md'},{path:'Bench/B.md'}];
test('synthetic listings use the real common loader and stay instance-local',async()=>{const a=await prepareBenchmarkTreeData(notes),b=await prepareBenchmarkTreeData([{path:'Bench/Other.md'}]);assert.equal(a.requests,2);assert.equal(a.folders,2);assert.equal(a.files,2);assert.deepEqual(a.source.get(''),{files:[],folders:['Bench']});assert.deepEqual(a.source.get('Bench').files,['Bench/A.md','Bench/B.md']);a.source.reset();assert.equal(a.source.get('Bench'),undefined);assert.deepEqual(b.source.get('Bench').files,['Bench/Other.md']);});
test('nested folder listings preserve ownership and list only direct children',async()=>{const r=await prepareBenchmarkTreeData([{path:'Bench/User1/Plan.md'},{path:'Bench/User2/Plan.md'}]);assert.equal(r.requests,4);assert.deepEqual(r.source.get('Bench').folders,['Bench/User1','Bench/User2']);assert.deepEqual(r.source.get('Bench/User1').files,['Bench/User1/Plan.md']);});
test('invalid paths and case-insensitive duplicates reject',async()=>{for(const paths of [['Other/A.md'],['Bench/../A.md'],['Bench/A.md','Bench/a.MD']])await assert.rejects(prepareBenchmarkTreeData(paths.map(path=>({path}))),/invalid_tree_fixture/);});
test('prior and mid-load cancellations cannot produce a prepared source',async()=>{const c=new AbortController();c.abort();await assert.rejects(prepareBenchmarkTreeData(notes,{signal:c.signal}),/cancelled/);const d=new AbortController();let calls=0;await assert.rejects(prepareBenchmarkTreeData(notes,{signal:d.signal,check(){if(++calls===2)d.abort();}}),/cancelled/);});
test('shared deadline callback also bounds listing preparation',async()=>{let calls=0;await assert.rejects(prepareBenchmarkTreeData(notes,{check(){if(++calls===3)throw Error('run_timeout');}}),/run_timeout/);});
test('renderer consumes loaded listings rather than silently reconstructing their order',async()=>{const data=await prepareBenchmarkTreeData(notes),f=dom();data.source.get('Bench').files.reverse();const rendered=renderBenchmarkTree({...f,notes,listings:data.source});assert.deepEqual(f.host.querySelectorAll().filter(x=>x.dataset.kind==='file').map(x=>x.dataset.path),['Bench/B.md','Bench/A.md']);rendered.dispose();assert.equal(f.host.children.length,0);});
test('measured DOM runner prepares fresh listings and reports them outside DOM samples',async()=>{const f=dom(),runner=createTreeWorkloadRunner({createButton:f.createButton,clock:()=>0,raf:cb=>setTimeout(cb,0),cancelRaf:clearTimeout});const r=await runner.execute({selected:['tree.dom.render'],warmup:1,repetitions:1,timeoutMs:1000,dataset:{notes:2,linksPerNote:1,noteKiB:1,seed:1}},{treeHost:f.host,signal:new AbortController().signal,authorize:async()=>{}});assert.equal(r.status,'ok');assert.equal(r.results[0].samples.length,2);assert.equal(r.results[0].statistics.count,1);assert.deepEqual(r.results[0].listingPreparation.map(x=>[x.phase,x.requests,x.folders,x.files]),[['warmup',2,2,2],['measurement',2,2,2]]);assert.equal(r.conditions.sharedListingLoaderVersion,1);assert.equal(r.conditions.listingPreparationExcluded,true);assert.equal(r.conditions.listingSource,'memory');assert.equal(f.host.children.length,0);});
