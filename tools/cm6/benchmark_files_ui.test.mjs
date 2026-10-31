import test from 'node:test';
import assert from 'node:assert/strict';
import {fileCycleReport,installFileCycleControls} from './benchmark_files_ui.js';
class Element{constructor(tag,text=''){this.tag=tag;this.textContent=text||'';this.children=[];this.listeners={};this.value='';}appendChild(x){this.children.push(x);return x;}addEventListener(k,f){this.listeners[k]=f;}setAttribute(){} }
function fixture(){const owner=new Element('section'),buttons=[],messages=[],calls=[];let active=true;
 const state={user:{id:7,isAdmin:false,mustChangePassword:false},csrf:'csrf'},signal=new AbortController().signal;
 const original={scenario:'server.files.cycle',status:'ok',cleanup:'ok',samples:[{elapsedMs:4,serverCycleMs:2}],statistics:{http:{count:1,median:4,mad:0},server:{count:1,median:2,mad:0}}};
 const root={WebVaultWorkspace:{active:'benchmark'},WebVaultCore:{state},fetch(){throw Error('unexpected_real_network');},crypto:{},performance:{now:()=>1}};
 const core={config(c){if(Object.values(c).some(v=>!Number.isInteger(v))||c.repetitions<1||c.warmup<0||c.repetitions+c.warmup>13)throw Error('invalid_parameter');return c;},async execute(c,request,o){calls.push({c,o});return original;}};
 let contextReader;
 const api={owner,node(tag,text,parent){const n=new Element(tag,text);if(parent)parent.appendChild(n);return n;},runButton(label,fn){const b={label,fn,disabled:false};buttons.push(b);return b;},message:s=>messages.push(s),capture:()=>()=>active,run:work=>work({signal})};
 const ui=installFileCycleControls(api,root,{core,createTransport(o){contextReader=o.getContext;return {requestId:'a'.repeat(32),request(){},sameContext:()=>active};}});
 const all=n=>[n,...n.children.flatMap(all)];return {ui,buttons,messages,calls,owner,root,original,inputs:all(owner).filter(n=>n.tag==='input'),setActive:v=>{active=v;},context:()=>contextReader()};
}
test('two distinct statistic rows preserve original report',()=>{const f=fixture(),r=fileCycleReport(f.original);assert.equal(r.results.length,2);assert.equal(r.results[0].statistics.median,4);assert.equal(r.results[1].statistics.median,2);assert.equal(r.samples,f.original.samples);assert.equal(f.original.results,undefined);});
test('initial button disabled; sync enables explicit file-only action',()=>{const f=fixture();assert.equal(f.buttons[0].disabled,true);f.ui.sync({canRun:true,running:false});assert.equal(f.buttons[0].disabled,false);assert.equal(f.calls.length,0);});
test('invalid total blocks launch without changing current report',()=>{const f=fixture();f.ui.sync({canRun:true,running:false});f.inputs[2].value='13';f.inputs[2].listeners.input();assert.equal(f.buttons[0].disabled,true);f.buttons[0].fn();assert.equal(f.calls.length,0);assert.equal(f.messages.length,1);});
test('uses common run signal and current context without editing notes',async()=>{const f=fixture();f.ui.sync({canRun:true,running:false});const r=await f.buttons[0].fn();assert.equal(r.results.length,2);assert.equal(f.calls.length,1);assert.equal(f.context().userId,7);assert.equal(f.context().csrf,'csrf');assert.equal(f.context().epoch,1);assert.equal(f.calls[0].o.signal.aborted,false);});
test('capture invalidation changes epoch even for returning same user',async()=>{const f=fixture();f.ui.sync({canRun:true,running:false});await f.buttons[0].fn();f.setActive(false);assert.equal(f.context().epoch,0);});
test('running disables repeat launch',()=>{const f=fixture();f.ui.sync({canRun:true,running:true});assert.equal(f.buttons[0].disabled,true);f.buttons[0].fn();assert.equal(f.calls.length,0);});
test('clear prevents launch until fresh sync',()=>{const f=fixture();f.ui.sync({canRun:true,running:false});f.ui.clear();assert.equal(f.buttons[0].disabled,true);f.buttons[0].fn();assert.equal(f.calls.length,0);});
test('fallback does not expose file action',()=>{const f=fixture();f.root.WebVaultWorkspace.active='notes';f.ui.sync({canRun:true,running:false});assert.equal(f.buttons[0].hidden,true);f.buttons[0].fn();assert.equal(f.calls.length,0);});
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function controlsFixture(){
 const nodes=[],buttons=new Map(),calls=[];let extension;
 function node(tag,text,parent){const n={tag,textContent:text||'',children:[],value:'',hidden:false,disabled:false,ownerDocument:{createTextNode:text=>({textContent:text})},appendChild(v){this.children.push(v);return v;},setAttribute(){},addEventListener(){}};if(parent)parent.appendChild(n);nodes.push(n);return n;}
 const root={location:{href:'https://example.test/'},WebVaultCore:{state:{user:{id:1,isAdmin:false,mustChangePassword:false},csrf:'token'}},crypto:{},performance:{now:()=>1},fetch(){throw Error('unexpected_network');}};
 root.WebVaultBenchmarkFilesCore={config:c=>c,async execute(){calls.push('files');return {status:'ok',cleanup:'ok',samples:[],statistics:{http:{count:1,median:2,mad:0},server:{count:1,median:1,mad:0}}};}};
 const api={owner:node('div'),node,button(text,parent,fn){const n=node('button',text,parent);n.onclick=fn;return n;},runButton(text,fn){const n=node('button',text);n.onclick=fn;buttons.set(text,n);return n;},hideHTTPStart(){},setHTTPVisible(){},capture:()=>()=>true,message:message=>assert.fail(message),run:work=>work({signal:new AbortController().signal,authorize:async()=>{},executeHTTP:async()=>{throw Error('unexpected_http');}})};
 root.WebVaultBenchmarkUI={attach:factory=>{extension=factory(api);}};
 const registry={catalog:[{id:'graph.model.build',label:'Model'}],async execute(){calls.push('components');return {status:'ok',cleanup:'ok',results:[{id:'graph.model.build',status:'ok'}],config:{}};}};
 const source=readFileSync(new URL('./benchmark_controls.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replace('export function installWorkloadControls','function installWorkloadControls');
 vm.runInNewContext(source+';installWorkloadControls(window);',{window:root,URL,createScreenWorkloadRegistry:()=>registry,datasetConfig:v=>v,LOAD_FIELDS:[],describeLoad:()=>({text:'',profile:{}}),importLoadReport(){},installFileCycleControls,createBenchmarkFilesTransport:()=>({requestId:'a'.repeat(32),request(){},sameContext:()=>true})});
 return {root,buttons,calls,get extension(){return extension;}};
}
test('controls lazily connect file UI exactly once after workspace becomes available',()=>{const f=controlsFixture();assert.equal(f.buttons.has('Запустить файловый цикл'),false);f.root.WebVaultWorkspace={active:'benchmark'};f.extension.sync({canRun:true,running:false});assert.equal(f.buttons.has('Запустить файловый цикл'),true);const b=f.buttons.get('Запустить файловый цикл');f.extension.sync({canRun:true,running:false});assert.equal(f.buttons.get('Запустить файловый цикл'),b);});
test('new file action does not replace existing selected-workload action',async()=>{const f=controlsFixture();f.root.WebVaultWorkspace={active:'benchmark'};f.extension.sync({canRun:true,running:false});await f.buttons.get('Запустить выбранные действия').onclick();assert.deepEqual(f.calls,['components']);const r=await f.buttons.get('Запустить файловый цикл').onclick();assert.equal(r.results.length,2);assert.deepEqual(f.calls,['components','files']);});
test('existing extension clear deactivates file launcher',()=>{const f=controlsFixture();f.root.WebVaultWorkspace={active:'benchmark'};f.extension.sync({canRun:true,running:false});f.extension.clear();assert.equal(f.buttons.get('Запустить файловый цикл').hidden,true);assert.equal(f.buttons.get('Запустить файловый цикл').disabled,true);});
