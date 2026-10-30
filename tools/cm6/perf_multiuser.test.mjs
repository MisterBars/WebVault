import test from 'node:test';
import assert from 'node:assert/strict';
import {loadConfig,actorsFor,runLoad} from './perf_multiuser.mjs';
const config={baseURL:'https://localhost/WebVault/',users:2,repetitions:2,warmup:1,sizeKiB:1,timeoutMs:1000},pool={testOnly:true,actors:[{login:'WVBench_01',password:'fixture-password-01'},{login:'WVBench_02',password:'fixture-password-02'}]};
function transport({bad=false}={}){const trace=[],runs=new Map();let active=0,peak=0;return {trace,get peak(){return peak;},fetch:async(url,o)=>{
 const path=url.pathname.split('/').pop(),p=o.body?JSON.parse(o.body):null;let actor=/WebVaultSession=(WVBench_\d+)/.exec(o.headers.Cookie||'')?.[1],cookies=[];const reply={ok:true};
 if(path==='login.ashx'){actor=p.login;cookies=['WebVaultSession='+actor+'; HttpOnly','WebVaultCsrf=fixture-cookie-'+actor+'; HttpOnly'];}
 else if(path==='me.ashx'){reply.user={id:Number(actor.slice(-2)),isAdmin:false,mustChangePassword:false};reply.csrfToken=actor.padEnd(44,'_');}
 else {assert.ok(actor);assert.equal(o.headers['X-CSRF-Token'],actor.padEnd(44,'_'));}
 trace.push({actor,path,action:p?.action,index:p?.index});
 if(p?.action==='status')reply.canRun=true;
 if(p?.action==='start'){const id=String(Number(actor.slice(-2))).padStart(32,'0');runs.set(actor,id);Object.assign(reply,{runId:id,scenario:'http.synthetic.read',scenarioVersion:1,fixtureVersion:1,bytes:1024,count:3});}
 if(p?.action==='step'){assert.equal(p.runId,runs.get(actor));active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;Object.assign(reply,{runId:p.runId,index:p.index,bytes:1024,text:bad?'bad':'x'.repeat(1024)});}
 return {ok:true,status:200,headers:{getSetCookie:()=>cookies},json:async()=>reply};
 }};}
test('load config enforces bounded target and users',()=>{for(const c of [{...config,users:17},{...config,pacingMs:0},{...config,baseURL:'http://remote.example/'},{...config,baseURL:'https://name:secret@localhost/'},{...config,users:'2'}])assert.throws(()=>loadConfig(c));});
test('only explicit unique synthetic account pool is accepted',()=>{assert.throws(()=>actorsFor({...pool,testOnly:false},2));assert.throws(()=>actorsFor({testOnly:true,actors:[pool.actors[0],pool.actors[0]]},2));assert.throws(()=>actorsFor({testOnly:true,actors:[{login:'ordinary',password:'fixture-password'}]},1));});
test('two independent sessions overlap while actor sequences remain ordered',async()=>{const t=transport(),r=await runLoad(config,pool,{fetchImpl:t.fetch,sleep:async()=>{}});assert.equal(r.status,'ok');assert.equal(r.actors.length,2);assert.equal(r.statistics.count,4);assert.equal(t.peak,2);for(const a of pool.actors)assert.deepEqual(t.trace.filter(x=>x.actor===a.login&&x.action==='step').map(x=>x.index),[0,1,2]);assert.ok(r.actors.every(a=>a.cleanup==='ok'&&a.logout==='ok'));for(const secret of [pool.actors[0].password,pool.actors[0].login,'fixture-cookie'])assert.equal(JSON.stringify(r).includes(secret),false);});
test('incorrect response aborts load without treating it as fast success',async()=>{const t=transport({bad:true}),r=await runLoad(config,pool,{fetchImpl:t.fetch,sleep:async()=>{}});assert.equal(r.status,'incomplete');assert.equal(r.statistics,null);assert.ok(r.actors.some(a=>a.status==='error'));assert.ok(r.actors.every(a=>a.logout==='ok'));});
test('already cancelled load does not authenticate actors',async()=>{const c=new AbortController();c.abort();let calls=0;const r=await runLoad(config,pool,{signal:c.signal,fetchImpl:async()=>{calls++;},sleep:async()=>{}});assert.equal(r.status,'cancelled');assert.equal(calls,0);});
