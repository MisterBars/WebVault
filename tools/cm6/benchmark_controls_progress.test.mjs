import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('./benchmark_controls.js',import.meta.url),'utf8');
const executable=source.replace(/^import .*;$/gm,'').replace('export function installWorkloadControls','function installWorkloadControls');
function setup({onProgress,execute,httpStatus='ok'}={}){
 const nodes=[],events=[],calls=[],own=new AbortController();let run,extension;
 function node(tag,text,parent){
  const x={tag,textContent:text??'',children:[],value:'',checked:false,hidden:false,disabled:false,files:[],attributes:{},ownerDocument:{createTextNode:text=>({textContent:text})},appendChild(c){this.children.push(c);return c;},setAttribute(k,v){this.attributes[k]=v;},addEventListener(){}};
  if(parent)parent.appendChild(x);nodes.push(x);return x;
 }
 const owner=node('div'),notice=onProgress===false?undefined:onProgress||((e)=>events.push(e));
 const context={signal:own.signal,authorize:async()=>{},onProgress:notice,httpConfig:{repetitions:1,warmup:0},executeHTTP:async()=>{calls.push('http');return {status:httpStatus,cleanup:'ok',samples:[],statistics:null};}};
 const registry={catalog:[{id:'graph.model.build',label:'Model'}],async execute(config,c){calls.push({config,context:c});if(execute)return execute(config,c);c.onProgress?.({stage:'step-end',id:'graph.model.build',completed:1,total:1});return {schemaVersion:1,batchId:'test',cleanup:'ok',results:[{id:'graph.model.build',status:'ok'}],config,conditions:{},unavailable:[]};}};
 const api={owner,node,button:(text,parent,fn)=>{const b=node('button',text,parent);b.onclick=fn;return b;},runButton:(text,fn)=>{run=fn;return node('button',text);},setHTTPVisible(){},hideHTTPStart(){},message:message=>assert.fail(message),run:work=>work(context),capture:()=>()=>true};
 const root={WebVaultBenchmarkWorkloads:registry,WebVaultBenchmarkUI:{attach:factory=>{extension=factory(api);}},location:{href:'https://example.test/'}};
 vm.runInNewContext(executable+';installWorkloadControls(window);',{datasetConfig:x=>x,LOAD_FIELDS:[],describeLoad:()=>({text:'',profile:{}}),importLoadReport(){},URL,window:root});
 return {nodes,events,calls,context,run:()=>run(),extension,host:()=>nodes.find(n=>n.className==='wv-benchmark-preview'),http:()=>nodes.find(n=>n.tag==='input'&&n.type==='checkbox')};
}

test('screen forwards the original progress callback, signal and authorization',async()=>{
 const f=setup();await f.run();const c=f.calls[0].context;
 assert.equal(c.onProgress,f.context.onProgress);assert.equal(c.signal,f.context.signal);assert.equal(c.authorize,f.context.authorize);
 assert.equal(f.events.length,1);assert.equal(f.events[0].id,'graph.model.build');assert.equal(f.host().hidden,true);
});
test('missing optional callback preserves the selected-workload report',async()=>{
 const a=setup(),b=setup({onProgress:false});assert.deepEqual(JSON.parse(JSON.stringify(await a.run())),JSON.parse(JSON.stringify(await b.run())));
 assert.equal(b.calls[0].context.onProgress,undefined);
});
test('HTTP completes before components and component events still reach the screen',async()=>{
 const f=setup();f.http().checked=true;const r=await f.run();assert.equal(f.calls[0],'http');assert.equal(f.events.length,1);assert.deepEqual(Array.from(r.results,x=>x.id),['http.synthetic.read','graph.model.build']);
});
test('failed HTTP skips components without fabricating component progress',async()=>{
 const f=setup({httpStatus:'error'});f.http().checked=true;const r=await f.run();assert.equal(f.calls.length,1);assert.equal(f.events.length,0);assert.equal(r.status,'incomplete');assert.equal(r.results[1].status,'skipped');
});
test('component exception still hides its rendering host',async()=>{
 const f=setup({execute:async()=>{throw Error('fixture_failure');}});await assert.rejects(f.run(),/fixture_failure/);assert.equal(f.host().hidden,true);
});
test('controls explicitly identify automatic graph mode and unavailable interactions',()=>{
 const f=setup();assert.ok(f.nodes.some(n=>n.tag==='p'&&n.textContent.includes('Режим графа: автоматический.')&&n.textContent.includes('Интерактивный режим')&&n.textContent.includes('пока недоступен')));
});
