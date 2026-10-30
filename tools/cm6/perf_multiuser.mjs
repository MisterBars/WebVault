import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {setTimeout as delay} from 'node:timers/promises';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const pause=(ms,signal)=>delay(ms,undefined,{signal});
function fail(code){throw Error(code);}
export function loadConfig(input){
 const defaults={users:1,repetitions:30,warmup:3,sizeKiB:64,timeoutMs:5000,rampMs:0,pacingMs:50};
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['baseURL',...Object.keys(defaults)].includes(k)))fail('invalid_load_config');
 const c={...defaults,...input};let url;try{url=new URL(c.baseURL);}catch{fail('invalid_target');}
 if(url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/')||!['https:','http:'].includes(url.protocol)||(url.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname)))fail('invalid_target');
 c.baseURL=url.href;for(const [k,min,max] of [['users',1,16],['repetitions',1,100],['warmup',0,10],['sizeKiB',1,256],['timeoutMs',1000,30000],['rampMs',0,30000],['pacingMs',50,5000]])if(!Number.isInteger(c[k])||c[k]<min||c[k]>max)fail('invalid_load_config');return c;
}
export function actorsFor(pool,count){
 if(!pool||Array.isArray(pool)||Object.keys(pool).some(k=>!['testOnly','actors'].includes(k))||pool.testOnly!==true||!Array.isArray(pool.actors)||pool.actors.length<count)fail('test_actor_pool_required');const actors=pool.actors.slice(0,count),names=new Set();
 for(const a of actors){if(!a||Object.keys(a).some(k=>!['login','password'].includes(k))||typeof a.login!=='string'||!/^WVBench_[A-Za-z0-9_.-]{1,48}$/i.test(a.login)||typeof a.password!=='string'||a.password.length<15||a.password.length>128)fail('invalid_test_actor');const name=a.login.toUpperCase();if(names.has(name))fail('duplicate_test_actor');names.add(name);}return actors;
}
function code(e){return typeof e?.message==='string'&&/^[a-z_]+$/.test(e.message)?e.message:'transport_failed';}
function stats(samples){if(!samples.length)return null;const a=samples.slice().sort((x,y)=>x-y),median=v=>v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2,m=median(a),r={unit:'ms',count:a.length,median:m,min:a[0],max:a.at(-1),mad:median(a.map(x=>Math.abs(x-m)).sort((x,y)=>x-y))};if(a.length>=100){r.p95=a[Math.ceil(.95*a.length)-1];r.p95Method='nearest-rank';}return r;}
export class ActorClient{
 constructor(baseURL,{fetchImpl=fetch,onActive=()=>{}}={}){this.base=baseURL;this.fetch=fetchImpl;this.onActive=onActive;this.jar=new Map();this.csrf=null;}
 async request(path,data,timeoutMs,signal){
  const ac=new AbortController(),abort=()=>ac.abort(),timer=setTimeout(()=>ac.abort(),timeoutMs);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)ac.abort();
  const headers={'X-WebVault-Request':'1','Origin':new URL(this.base).origin};if(this.jar.size)headers.Cookie=Array.from(this.jar,([k,v])=>k+'='+v).join('; ');if(data!==null){headers['Content-Type']='application/json';if(this.csrf)headers['X-CSRF-Token']=this.csrf;}
  this.onActive(1);
  try{
   const r=await this.fetch(new URL(path,this.base),{method:data===null?'GET':'POST',headers,body:data===null?undefined:JSON.stringify(data),redirect:'manual',signal:ac.signal});
   if(r.status>=300&&r.status<400)fail('redirect_rejected');if(typeof r.headers.getSetCookie!=='function')fail('set_cookie_api_required');
   for(const line of r.headers.getSetCookie()){const first=line.split(';')[0],i=first.indexOf('='),name=first.slice(0,i),value=first.slice(i+1);if(i<1||!['WebVaultSession','WebVaultCsrf'].includes(name))continue;if(value)this.jar.set(name,value);else this.jar.delete(name);}
   let b;try{b=await r.json();}catch{fail('invalid_json_response');}if(!r.ok||b.ok!==true)fail(typeof b.error==='string'&&/^[a-z_]+$/.test(b.error)?b.error:'http_error');return b;
  }catch(e){if(ac.signal.aborted)fail(signal?.aborted?'cancelled':'request_timeout');throw e;}
  finally{this.onActive(-1);clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }
 async login(actor,timeout,signal){
  await this.request('api/auth/login.ashx',{login:actor.login,password:actor.password},timeout,signal);
  if(!this.jar.has('WebVaultSession')||!this.jar.has('WebVaultCsrf'))fail('session_cookies_missing');
  this.csrf=this.jar.get('WebVaultCsrf');
  const me=await this.request('api/auth/me.ashx',null,timeout,signal);if(!me.user||me.user.isAdmin||me.user.mustChangePassword||!Number.isInteger(me.user.id)||typeof me.csrfToken!=='string'||me.csrfToken.length!==44)fail('ordinary_test_account_required');this.csrf=me.csrfToken;
  const rights=await this.request('api/benchmark.ashx',{action:'status'},timeout,signal);if(rights.canRun!==true)fail('benchmark_permission_required');return me.user.id;
 }
 async logout(){try{await this.request('api/auth/logout.ashx',{},5000,null);return 'ok';}catch(e){return ['unauthenticated','cancelled'].includes(code(e))?'already_ended':'unconfirmed';}finally{this.jar.clear();this.csrf=null;}}
}
export async function runLoad(input,pool,{signal,fetchImpl=fetch,sleep=pause,clock=()=>performance.now()}={}){
 const config=loadConfig(input),actors=actorsFor(pool,config.users),controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 let active=0,peak=0,stopped=false,deadlineExpired=false;const sessions=[],results=[],ids=new Set(),jobId=randomUUID().replaceAll('-','');
 const report={schemaVersion:1,jobId,scope:'node-independent-test-sessions-http-synthetic',scenario:'http.synthetic.read',scenarioVersion:1,fixtureVersion:1,config,agent:{node:process.version,platform:process.platform,arch:process.arch},actors:results,unavailable:['real note operations','graph rendering','browser UI','server stages','CPU','memory'],plannedSteps:config.users*(config.repetitions+config.warmup),plannedTextBytes:config.users*(config.repetitions+config.warmup)*config.sizeKiB*1024};
 let phaseStart=null,phaseEnd=null;
 try{
  for(let i=0;i<actors.length;i++){
   if(controller.signal.aborted)fail('cancelled');const client=new ActorClient(config.baseURL,{fetchImpl,onActive:n=>{active+=n;peak=Math.max(peak,active);}}),row={actor:i+1,status:'preparing',samples:[],cleanup:'not_needed',logout:'pending'};sessions.push({client,row});results.push(row);
   const id=await client.login(actors[i],config.timeoutMs,controller.signal);if(ids.has(id))fail('duplicate_authenticated_user');ids.add(id);row.status='ready';if(i+1<actors.length)await sleep(1000,controller.signal);
  }
  active=0;peak=0;phaseStart=clock();const timer=setTimeout(()=>{deadlineExpired=true;abort();},120000);
  try{await Promise.all(sessions.map(async({client,row},i)=>{
   let runId=null,startAttempted=false;
   try{
    await sleep(config.users>1?i*config.rampMs/(config.users-1):0,controller.signal);if(controller.signal.aborted)fail('cancelled');
    startAttempted=true;const start=await client.request('api/benchmark.ashx',{action:'start',repetitions:config.repetitions,warmup:config.warmup,sizeKiB:config.sizeKiB},config.timeoutMs,controller.signal);
    if(typeof start.runId==='string'&&/^[a-f0-9]{32}$/.test(start.runId))runId=start.runId;
    if(!runId||start.scenario!=='http.synthetic.read'||start.scenarioVersion!==1||start.fixtureVersion!==1||start.bytes!==config.sizeKiB*1024||start.count!==config.repetitions+config.warmup)fail('incorrect_start_result');
    for(let j=0;j<start.count;j++){
     if(controller.signal.aborted)fail('cancelled');const phase=j<config.warmup?'warmup':'measurement',t=clock();
     try{const b=await client.request('api/benchmark.ashx',{action:'step',runId,index:j},config.timeoutMs,controller.signal);if(b.runId!==runId||b.index!==j||b.bytes!==start.bytes||b.text!=='x'.repeat(start.bytes))fail('incorrect_step_result');const elapsedMs=clock()-t;if(elapsedMs>config.timeoutMs)fail('request_timeout');if(controller.signal.aborted)fail('cancelled');row.samples.push({phase,status:'ok',elapsedMs});}
     catch(e){row.samples.push({phase,status:deadlineExpired?'timeout':controller.signal.aborted?'cancelled':code(e)==='request_timeout'?'timeout':'error',reason:code(e)});throw e;}
     if(j+1<start.count)await sleep(config.pacingMs,controller.signal);
    }row.status='ok';
   }catch(e){row.status=deadlineExpired?'timeout':controller.signal.aborted?'cancelled':code(e)==='request_timeout'?'timeout':'error';row.reason=code(e);stopped=true;controller.abort();}
   finally{
    phaseEnd=Math.max(phaseEnd??phaseStart,clock());
    if(runId){try{await client.request('api/benchmark.ashx',{action:'cancel',runId},5000,null);row.cleanup='ok';}catch{row.cleanup='unconfirmed';if(row.status==='ok')row.status='incomplete';}}
    if(startAttempted&&!runId)row.cleanup='unconfirmed';
    row.statistics=stats(row.samples.filter(s=>s.phase==='measurement'&&s.status==='ok').map(s=>s.elapsedMs));
   }
  }));}finally{clearTimeout(timer);}
 }catch(e){report.error=code(e);stopped=true;controller.abort();}
 finally{report.peakClientInFlight=phaseStart===null?0:peak;await Promise.all(sessions.map(async({client,row})=>{row.logout=await client.logout();if(row.status==='ready'||row.status==='preparing')row.status='not_executed';if(row.logout==='unconfirmed'&&row.status==='ok')row.status='incomplete';}));signal?.removeEventListener('abort',abort);}
 const measured=results.flatMap(r=>r.samples.filter(s=>s.phase==='measurement'&&s.status==='ok').map(s=>s.elapsedMs)),successfulSteps=results.reduce((n,r)=>n+r.samples.filter(s=>s.status==='ok').length,0);
 report.terminationReason=deadlineExpired?'run_timeout':signal?.aborted?'cancelled':stopped?'actor_error':null;report.phaseElapsedMs=phaseStart!==null&&phaseEnd!==null?phaseEnd-phaseStart:null;report.statistics=stats(measured);report.status=signal?.aborted?'cancelled':!stopped&&results.length===config.users&&results.every(r=>r.status==='ok')?'ok':'incomplete';report.successfulSteps=successfulSteps;return report;
}
export async function main(args=process.argv.slice(2)){
 try{if(args.length!==4||args[0]!=='--config'||args[2]!=='--actors')fail('usage_config_and_actors_required');const config=JSON.parse(readFileSync(args[1],'utf8')),pool=JSON.parse(readFileSync(args[3],'utf8')),c=new AbortController(),abort=()=>c.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);try{const result=await runLoad(config,pool,{signal:c.signal});process.stdout.write(JSON.stringify(result,null,2)+'\n');return result.status==='ok'?0:result.status==='cancelled'?130:1;}finally{process.off('SIGINT',abort);process.off('SIGTERM',abort);}}
 catch(e){process.stderr.write(code(e)+'\n');return 1;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=await main();
