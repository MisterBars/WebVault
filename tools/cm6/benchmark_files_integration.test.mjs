import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import './benchmark_files_core.js';
import {createBenchmarkFilesTransport} from './benchmark_files_transport.js';
const core=globalThis.WebVaultBenchmarkFilesCore;
const config={actors:2,sizeKiB:1,repetitions:2,warmup:1,timeoutMs:1000};
function payloadId(run,index){const b=createHash('sha256').update('WebVault.Bench.Payload.v1|'+run+'|'+index).digest();return [3,2,1,0,5,4,7,6,8,9,10,11,12,13,14,15].map(i=>b[i].toString(16).padStart(2,'0')).join('');}
function fixture(hook=()=>{}){
 let context={userId:7,csrf:'private-csrf',epoch:1,isAdmin:false,mustChangePassword:false},record=null;
 const runId='b'.repeat(32),calls=[];
 const fetch=async(url,options)=>{
  assert.equal(url,'api/benchmark_files.ashx');assert.equal(options.method,'POST');assert.equal(options.headers['X-CSRF-Token'],'private-csrf');
  const p=JSON.parse(options.body);calls.push(p);
  const b={ok:true,protocolVersion:1,scenario:'server.files.cycle',scenarioVersion:1,fixtureVersion:1,requestId:p.requestId};
  if(p.action==='start'){
   assert.equal(record,null);record={requestId:p.requestId,actors:p.actors,bytes:p.sizeKiB*1024,count:p.count,next:0,state:'ready',cleanup:'unconfirmed'};
  }else if(record)assert.equal(p.requestId,record.requestId);
  if(p.action==='step'){
   assert.ok(record);assert.equal(p.index,record.next);record.next++;
   Object.assign(b,{runId,payloadId:payloadId(runId,p.index),index:p.index,actors:record.actors,bytes:record.bytes,verifiedReads:record.actors*3,serverCycleMs:4,cleanup:'ok',remainingObjects:0});
  }else{
   if(p.action==='cancel'&&record){record.state='stopped';record.cleanup='ok';}
   Object.assign(b,record?{found:true,runId,state:record.state,next:record.next,count:record.count,actors:record.actors,bytes:record.bytes,expiresUtc:'2030-01-01T00:00:00Z',expired:false,cleanup:record.cleanup}:{found:false,runId:null,state:'absent',next:0,count:0,actors:0,bytes:0,expiresUtc:null,expired:false,cleanup:'unconfirmed'});
  }
  await hook({p,b,signal:options.signal,change:v=>{context={...context,...v};}});
  return {ok:b.ok===true,redirected:false,text:async()=>JSON.stringify(b)};
 };
 const transport=createBenchmarkFilesTransport({getContext:()=>context,fetch,crypto:webcrypto});
 let time=0;
 return {calls,record:()=>record,execute:signal=>core.execute(config,transport.request,{requestId:transport.requestId,sameContext:transport.sameContext,signal,crypto:webcrypto,clock:()=>time++})};
}
test('real core and transport: full cycle, one requestId, separate measurement statistics',async()=>{
 const f=fixture(),r=await f.execute();assert.equal(r.status,'ok');assert.equal(r.cleanup,'ok');assert.equal(r.samples.length,3);assert.equal(r.statistics.http.count,2);assert.equal(r.statistics.server.count,2);assert.equal(r.statistics.server.median,4);
 assert.deepEqual(f.calls.map(p=>p.action),['start','step','step','step','cancel']);assert.equal(new Set(f.calls.map(p=>p.requestId)).size,1);assert.equal(f.record().state,'stopped');assert.ok(!JSON.stringify(r).includes('private-csrf'));
});
for(const action of ['start','step'])test('lost '+action+' reply after server mutation: reconcile and cancel without repeating',async()=>{
 const f=fixture(({p})=>{if(p.action===action)throw Error('network_failure');}),r=await f.execute();
 assert.equal(r.status,'error');assert.equal(r.cleanup,'ok');assert.equal(r.reconciliation,'found');assert.equal(r.samples.length,0);assert.equal(f.record().next,action==='start'?0:1);
 assert.deepEqual(f.calls.map(p=>p.action),action==='start'?['start','status','cancel']:['start','step','status','cancel']);
});
test('wrong bound payload from server rejected before sample acceptance',async()=>{
 const f=fixture(({p,b})=>{if(p.action==='step')b.payloadId='c'.repeat(32);}),r=await f.execute();assert.equal(r.reason,'incorrect_result');assert.equal(r.samples.length,0);assert.equal(r.cleanup,'ok');
});
test('permission error is retained and maintenance uses original context',async()=>{
 const f=fixture(({p,b})=>{if(p.action==='step')Object.assign(b,{ok:false,error:'benchmark_permission_changed'});}),r=await f.execute();assert.equal(r.reason,'benchmark_permission_changed');assert.equal(r.cleanup,'ok');assert.equal(r.samples.length,0);assert.deepEqual(f.calls.map(p=>p.action),['start','step','status','cancel']);
});
test('context changes in response: no status or cancel through new session',async()=>{
 const f=fixture(({p,change})=>{if(p.action==='step')change({epoch:2,csrf:'new-csrf'});}),r=await f.execute();assert.equal(r.reason,'session_changed');assert.equal(r.cleanup,'unconfirmed');assert.equal(r.samples.length,0);assert.deepEqual(f.calls.map(p=>p.action),['start','step']);
});
test('unconfirmed run cleanup prevents overall ok',async()=>{
 const f=fixture(({p,b})=>{if(p.action==='cancel')b.cleanup='unconfirmed';}),r=await f.execute();assert.equal(r.status,'incomplete');assert.equal(r.cleanup,'unconfirmed');assert.equal(r.statistics.http.count,2);
});
test('busy cancel is never retried',async()=>{
 const f=fixture(({p,b})=>{if(p.action==='cancel')Object.assign(b,{ok:false,error:'benchmark_busy'});}),r=await f.execute();assert.equal(r.status,'incomplete');assert.equal(r.cleanup,'unconfirmed');assert.equal(f.calls.filter(p=>p.action==='cancel').length,1);
});
test('foreign run in reconciliation is rejected without further mutation',async()=>{
 const f=fixture(({p,b})=>{if(p.action==='step')throw Error('network_failure');if(p.action==='status')b.runId='c'.repeat(32);}),r=await f.execute();assert.equal(r.status,'error');assert.equal(r.cleanup,'unconfirmed');assert.deepEqual(f.calls.map(p=>p.action),['start','step','status']);
});
test('abort hung step: original-context status and cancel still attempted',async()=>{
 const a=new AbortController();let aborted=false;
 const f=fixture(({p,signal})=>{if(p.action==='step')return new Promise(()=>{signal.addEventListener('abort',()=>{aborted=true;});setTimeout(()=>a.abort(),10);});}),r=await f.execute(a.signal);
 assert.equal(r.status,'cancelled');assert.equal(aborted,true);assert.equal(r.cleanup,'ok');assert.equal(r.samples.length,0);assert.deepEqual(f.calls.map(p=>p.action),['start','step','status','cancel']);
});
