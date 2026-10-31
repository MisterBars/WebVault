(function(root){'use strict';
const scenario='server.files.cycle';
const id=v=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v)&&v!=='0'.repeat(32);
function int(v,a,b){if(!Number.isInteger(v)||v<a||v>b)throw Error('invalid_parameter');return v;}
function config(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['actors','sizeKiB','repetitions','warmup','timeoutMs'].includes(k)))throw Error('invalid_parameter');
 const c={actors:int(v.actors,1,8),sizeKiB:int(v.sizeKiB,1,64),repetitions:int(v.repetitions,1,13),warmup:int(v.warmup,0,12),timeoutMs:int(v.timeoutMs,1000,30000)};
 if(c.repetitions+c.warmup>13)throw Error('invalid_parameter');return c;
}
async function boundId(run,index,crypto){
 if(!id(run))throw Error('invalid_parameter');int(index,0,12);
 const data=new TextEncoder().encode('WebVault.Bench.Payload.v1|'+run+'|'+index);
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
 // .NET Guid(byte[]) stores its first three fields in little-endian order.
 return [3,2,1,0,5,4,7,6,8,9,10,11,12,13,14,15].map(i=>bytes[i].toString(16).padStart(2,'0')).join('');
}
function stats(a){if(!a.length)return null;const s=a.slice().sort((a,b)=>a-b),med=a=>a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2,m=med(s);return {unit:'ms',count:s.length,min:s[0],max:s[s.length-1],median:m,mad:med(s.map(x=>Math.abs(x-m)).sort((a,b)=>a-b))};}
// request(body, timeoutMs, signal) must use a fixed endpoint and the original
// session/CSRF, never retry mutations or silently switch credentials.
// sameContext() is mandatory, synchronous, and compares a captured context.
async function execute(input,request,o){
 const c=config(input);if(!o||!id(o.requestId)||typeof request!=='function'||typeof o.sameContext!=='function')throw Error('invalid_parameter');
 const requestId=o.requestId,crypto=o.crypto||root.crypto,clock=o.clock||(()=>performance.now()),signal=o.signal||new AbortController().signal;
 if(!crypto||!crypto.subtle)throw Error('crypto_unavailable');
 const samples=[],total=c.repetitions+c.warmup,start=clock();let runId=null,status='error',reason=null,attempted=false,cleanup='not-needed',reconciliation='not-needed';
 function context(){if(o.sameContext()!==true)throw Error('session_changed');}
 function guard(){context();if(signal.aborted)throw Error('cancelled');if(clock()-start>=120000)throw Error('run_timeout');}
 function base(b){if(!b||b.ok!==true||b.protocolVersion!==1||b.scenario!==scenario||b.scenarioVersion!==1||b.fixtureVersion!==1||b.requestId!==requestId)throw Error('invalid_result');}
 function state(b){base(b);if(b.found!==true&&b.found!==false)throw Error('invalid_result');
  if(!b.found){if(b.state!=='absent'||b.runId!==null||b.next!==0||b.count!==0||b.actors!==0||b.bytes!==0||b.cleanup!=='unconfirmed')throw Error('invalid_result');return b;}
  if(!id(b.runId)||(runId&&b.runId!==runId)||!['ready','working','stopped'].includes(b.state)||!Number.isInteger(b.next)||b.next<0||b.next>total||b.count!==total||b.actors!==c.actors||b.bytes!==c.sizeKiB*1024||typeof b.expired!=='boolean'||!['ok','unconfirmed'].includes(b.cleanup)||typeof b.expiresUtc!=='string'||!Number.isFinite(Date.parse(b.expiresUtc)))throw Error('invalid_result');runId=b.runId;return b;
 }
 async function call(body,maintenance){
  context();if(!maintenance)guard();const t=clock(),budget=maintenance?5000:Math.min(c.timeoutMs,120000-(t-start)),controller=new AbortController();let timer,listener;
  const stop=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('request_timeout'));},budget);if(!maintenance){listener=()=>{controller.abort();reject(Error('cancelled'));};signal.addEventListener('abort',listener,{once:true});if(signal.aborted)listener();}});
  try{const result=await Promise.race([Promise.resolve().then(()=>{context();if(controller.signal.aborted)throw Error('cancelled');return request(body,budget,controller.signal);}),stop]);context();if(!maintenance)guard();if(clock()-t>budget)throw Error('request_timeout');return result;}
  finally{clearTimeout(timer);if(listener)signal.removeEventListener('abort',listener);}
 }
 try{
  guard();attempted=true;const b=state(await call({action:'start',requestId,actors:c.actors,sizeKiB:c.sizeKiB,count:total},false));
  if(!b.found||b.state!=='ready'||b.next!==0||b.expired)throw Error('invalid_start_result');
  for(let index=0;index<total;index++){
   const expected=await boundId(runId,index,crypto);guard();const t=clock(),b=await call({action:'step',requestId,index},false);base(b);
   if(b.runId!==runId||b.index!==index||b.actors!==c.actors||b.bytes!==c.sizeKiB*1024||b.verifiedReads!==c.actors*3||b.payloadId!==expected||!Number.isFinite(b.serverCycleMs)||b.serverCycleMs<0||b.cleanup!=='ok'||b.remainingObjects!==0)throw Error('incorrect_result');
   const elapsedMs=clock()-t;if(!Number.isFinite(elapsedMs)||elapsedMs<0)throw Error('invalid_timing');
   samples.push({index,phase:index<c.warmup?'warmup':'measurement',status:'ok',elapsedMs,serverCycleMs:b.serverCycleMs});
  }status='ok';
 }catch(e){status=signal.aborted||e.message==='cancelled'?'cancelled':['request_timeout','run_timeout'].includes(e.message)?'timeout':'error';reason=/^[a-z_]+$/.test(e.message||'')?e.message:'request_failed';}
 if(attempted){cleanup='unconfirmed';try{
  context();if(status!=='ok'){const b=state(await call({action:'status',requestId},true));reconciliation=b.found?'found':'absent';}
  // An absent status may race with an in-flight start; it never proves cleanup.
  const b=state(await call({action:'cancel',requestId},true));
  if(b.found&&b.state==='stopped'&&b.cleanup==='ok'&&(status!=='ok'||b.next===total))cleanup='ok';
 }catch(e){/* Keep uncertainty; never retry mutations or use another session. */}}
 if(status==='ok'&&cleanup!=='ok'){status='incomplete';reason='cleanup_unconfirmed';}
 const measured=samples.filter(s=>s.phase==='measurement');
 return {schemaVersion:1,protocolVersion:1,scenario,scenarioVersion:1,fixtureVersion:1,requestId,runId,config:c,status,reason,cleanup,reconciliation,samples,statistics:{http:stats(measured.map(s=>s.elapsedMs)),server:stats(measured.map(s=>s.serverCycleMs))}};
}
root.WebVaultBenchmarkFilesCore={config,boundId,execute};
})(typeof globalThis!=='undefined'?globalThis:this);
