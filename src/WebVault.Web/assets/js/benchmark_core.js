(function(root){'use strict';
function integer(v,min,max){if(!Number.isInteger(v)||v<min||v>max)throw Error('invalid_parameter');return v;}
function config(v){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(function(k){return !['repetitions','warmup','sizeKiB','timeoutMs'].includes(k);}))throw Error('invalid_parameter');return {repetitions:integer(v.repetitions,1,100),warmup:integer(v.warmup,0,10),sizeKiB:integer(v.sizeKiB,1,256),timeoutMs:integer(v.timeoutMs,1000,30000)};}
function stats(a){if(!a.length)return null;if(a.some(function(v){return !Number.isFinite(v)||v<0;}))throw Error('invalid_timing');var s=a.slice().sort(function(x,y){return x-y;}),median=function(v){return v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2;},m=median(s),r={unit:'ms',count:s.length,median:m,min:s[0],max:s[s.length-1],mad:median(s.map(function(x){return Math.abs(x-m);}).sort(function(x,y){return x-y;}))};if(s.length>=100){r.p95=s[Math.ceil(.95*s.length)-1];r.p95Method='nearest-rank';}return r;}
function errorStatus(e,signal){return signal.aborted?'cancelled':(e.message==='request_timeout'||e.message==='run_timeout'?'timeout':'error');}
async function execute(input,request,signal,clock){
 var c=config(input),samples=[],run=null,status='error',reason=null,start=clock();
 try{
  if(signal.aborted)throw Error('cancelled');run=await request({action:'start',repetitions:c.repetitions,warmup:c.warmup,sizeKiB:c.sizeKiB},c.timeoutMs,signal);
  if(run.ok!==true||!/^[a-f0-9]{32}$/.test(run.runId)||run.scenario!=='http.synthetic.read'||run.scenarioVersion!==1||run.fixtureVersion!==1||run.bytes!==c.sizeKiB*1024||run.count!==c.repetitions+c.warmup)throw Error('invalid_start_result');
  for(var i=0;i<run.count;i++){
   if(signal.aborted)throw Error('cancelled');if(clock()-start>=120000)throw Error('run_timeout');var phase=i<c.warmup?'warmup':'measurement',t=clock(),budget=Math.min(c.timeoutMs,Math.max(1,120000-(t-start))),b;
   try{
    b=await request({action:'step',runId:run.runId,index:i},budget,signal);
    if(signal.aborted)throw Error('cancelled');
    if(b.ok!==true||b.runId!==run.runId||b.index!==i||b.bytes!==run.bytes||b.text!=='x'.repeat(run.bytes))throw Error('incorrect_result');
    var end=clock();if(end-start>=120000)throw Error('run_timeout');if(end-t>budget)throw Error('request_timeout');samples.push({phase:phase,status:'ok',elapsedMs:end-t});
   }catch(e){samples.push({phase:phase,status:errorStatus(e,signal)});throw e;}
   if(i+1<run.count)await new Promise(function(resolve){setTimeout(resolve,50);});
  }status='ok';
 }catch(e){status=errorStatus(e,signal);reason=typeof e.message==='string'&&/^[a-z_]+$/.test(e.message)?e.message:'request_failed';}
 var cleanup='not-needed';
 if(run&&/^[a-f0-9]{32}$/.test(run.runId)){try{await request({action:'cancel',runId:run.runId},5000,new AbortController().signal);cleanup='ok';}catch(e){cleanup='unconfirmed';}}
 if(status==='ok'&&cleanup==='unconfirmed')status='incomplete';
 return {schemaVersion:1,scenario:'http.synthetic.read',scenarioVersion:1,fixtureVersion:1,runId:run?run.runId:null,config:c,status:status,reason:reason,cleanup:cleanup,samples:samples,statistics:stats(samples.filter(function(s){return s.phase==='measurement'&&s.status==='ok';}).map(function(s){return s.elapsedMs;})),unavailable:['server stages','CPU','memory','note opening','editor UI readiness']};
}
root.WebVaultBenchmarkCore={config:config,statistics:stats,execute:execute};
}(typeof globalThis!=='undefined'?globalThis:this));
