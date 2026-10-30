import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../src/WebVault.Web/assets/js/benchmark_core.js',import.meta.url),'utf8');
function core(){const context={AbortController,setTimeout,clearTimeout};vm.runInNewContext(source,context);return context.WebVaultBenchmarkCore;}
const config={repetitions:1,warmup:0,sizeKiB:1,timeoutMs:1000},id='a'.repeat(32);
function transport({bad=false,cleanupError=false}={}){return async p=>{if(p.action==='start')return {ok:true,runId:id,scenario:'http.synthetic.read',scenarioVersion:1,fixtureVersion:1,bytes:1024,count:1};if(p.action==='cancel'){if(cleanupError)throw Error('network_error');return {ok:true};}return {ok:true,runId:id,index:0,bytes:1024,text:bad?'bad':'x'.repeat(1024)};};}
const run=(request,observer,signal=new AbortController().signal)=>core().execute(config,request,signal,()=>0,observer);
test('optional progress preserves report and emits ordered stages',async()=>{const events=[],plain=await run(transport()),observed=await run(transport(),e=>events.push(e));assert.equal(JSON.stringify(plain),JSON.stringify(observed));assert.deepEqual(events.map(e=>e.stage),['starting','step-start','step-end','cleanup','finished']);assert.equal(events[2].completed,1);assert.equal(events.at(-1).status,'ok');assert.ok(events.every(e=>e.total===1));});
test('incorrect response never increments successful count',async()=>{const events=[],r=await run(transport({bad:true}),e=>events.push(e));assert.equal(r.status,'error');assert.equal(events.at(-1).completed,0);assert.equal(events.find(e=>e.stage==='step-end').status,'error');});
test('unconfirmed cleanup precedes final incomplete result',async()=>{const events=[],r=await run(transport({cleanupError:true}),e=>events.push(e));assert.equal(r.cleanup,'unconfirmed');assert.equal(events.at(-2).stage,'cleanup');assert.equal(events.at(-1).status,'incomplete');});
test('observer exception cannot suppress cleanup or corrupt success',async()=>{const r=await run(transport(),()=>{throw Error('ui_error');});assert.equal(r.status,'ok');assert.equal(r.cleanup,'ok');});
test('cancellation in step-start observer sends no step',async()=>{const c=new AbortController(),t=transport();let steps=0;const r=await run(async p=>{if(p.action==='step')steps++;return t(p);},e=>{if(e.stage==='step-start')c.abort();},c.signal);assert.equal(steps,0);assert.equal(r.status,'cancelled');assert.equal(r.cleanup,'ok');});
test('progress payload contains only documented fields, not request content',async()=>{const events=[];await run(transport(),e=>events.push(e));const allowed=['id','stage','index','phase','status','completed','total'];assert.ok(events.every(e=>Object.keys(e).every(k=>allowed.includes(k))));assert.equal(JSON.stringify(events).includes(id),false);});
