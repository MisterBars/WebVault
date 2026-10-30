// Contract and commands: ./PERFORMANCE.md. This tool never contacts the site.
import {Worker} from 'node:worker_threads';
import {performance} from 'node:perf_hooks';
import {setTimeout as sleep} from 'node:timers/promises';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import os from 'node:os';
export const IDS=['index.references.extract','index.graph.build','index.backlinks.lookup'];
function fields(v,allowed){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('object');for(const k of Object.keys(v))if(!allowed.includes(k))throw Error('field');}
function params(v){fields(v,['repetitions','warmup','timeoutMs','size']);const p={repetitions:30,warmup:3,timeoutMs:5000,size:50,...v};for(const [k,a,b] of [['repetitions',1,200],['warmup',0,20],['timeoutMs',100,30000],['size',2,300]])if(!Number.isInteger(p[k])||p[k]<a||p[k]>b)throw Error('parameter');return p;}
export function configuration(v={}){
 fields(v,['select','defaults','overrides','maxRunMs']);let ids;const s=v.select===undefined?'all':v.select;
 if(s==='all'||s==='index')ids=IDS.slice();else if(Array.isArray(s)&&s.length&&new Set(s).size===s.length&&s.every(id=>IDS.includes(id)))ids=IDS.filter(id=>s.includes(id));else throw Error('selection');
 const d=params(v.defaults===undefined?{}:v.defaults),o=v.overrides===undefined?{}:v.overrides;fields(o,ids);
 const maxRunMs=v.maxRunMs===undefined?120000:v.maxRunMs;if(!Number.isInteger(maxRunMs)||maxRunMs<100||maxRunMs>600000)throw Error('deadline');
 return {maxRunMs,minIntervalMs:10,scenarios:ids.map(id=>{const q=Object.hasOwn(o,id)?o[id]:{};fields(q,['repetitions','warmup','timeoutMs','size']);return {id,version:1,...params({...d,...q})};})};
}
export function statistics(values){
 if(!values.length)return null;if(values.some(x=>!Number.isFinite(x)||x<0))throw Error('timing');
 const a=values.slice().sort((x,y)=>x-y),median=v=>v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2,m=median(a);
 const r={unit:'ms',count:a.length,median:m,min:a[0],max:a.at(-1),mad:median(a.map(x=>Math.abs(x-m)).sort((x,y)=>x-y))};
 if(a.length>=100){r.p95=a[Math.ceil(.95*a.length)-1];r.p95Method='nearest-rank';}return r;
}
class Channel{
 constructor(worker){this.worker=worker;this.queue=[];this.pending=null;this.failure=null;this.message=v=>this.pending?this.settle(v):this.queue.push(v);this.error=()=>this.fail('worker-error');this.exit=()=>this.fail('worker-exit');worker.on('message',this.message);worker.on('error',this.error);worker.on('exit',this.exit);}
 settle(v){const p=this.pending;this.pending=null;if(p){p.cleanup();p.resolve(v);}}
 fail(reason){this.failure={status:'error',reason};this.settle(this.failure);}
 next(ms,signal){
  if(signal?.aborted)return Promise.resolve({status:'cancelled'});if(ms<=0)return Promise.resolve({status:'timeout'});if(this.failure)return Promise.resolve(this.failure);if(this.queue.length)return Promise.resolve(this.queue.shift());
  return new Promise(resolve=>{const abort=()=>this.settle({status:'cancelled'}),timer=setTimeout(()=>this.settle({status:'timeout'}),ms);this.pending={resolve,cleanup:()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);}};signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();});
 }
 async close(){await this.worker.terminate();this.worker.off('message',this.message);this.worker.off('error',this.error);this.worker.off('exit',this.exit);}
}
const failed=m=>({status:['error','timeout','cancelled'].includes(m?.status)?m.status:'error',reason:['worker-error','worker-exit'].includes(m?.reason)?m.reason:'incomplete-or-invalid-result'});
export async function scenario(spec,{workerURL=new URL('./perf_worker.mjs',import.meta.url),signal,deadline=Infinity,onReady=()=>{}}={}){
 const r={id:spec.id,version:spec.version,status:'pending',samples:[]};let channel;const budget=()=>Math.min(spec.timeoutMs,deadline-performance.now());
 try{
  if(signal?.aborted)return Object.assign(r,{status:'cancelled'});if(budget()<=0)return Object.assign(r,{status:'timeout'});
  channel=new Channel(new Worker(workerURL,{workerData:{id:spec.id,size:spec.size},resourceLimits:{maxOldGenerationSizeMb:128,maxYoungGenerationSizeMb:32,stackSizeMb:4}}));
  const ready=await channel.next(budget(),signal);if(ready?.type!=='ready'||!/^[a-f0-9]{64}$/.test(ready.hash??''))return Object.assign(r,failed(ready));r.fixtureHash=ready.hash;onReady();
  for(let i=0;i<spec.warmup+spec.repetitions;i++){
   const phase=i<spec.warmup?'warmup':'measurement';if(signal?.aborted||budget()<=0){r.status=signal?.aborted?'cancelled':'timeout';break;}
   channel.worker.postMessage({type:'sample',sequence:i});const m=await channel.next(budget(),signal);
   if(m?.type!=='sample'||m.sequence!==i||m.status!=='ok'||!Number.isFinite(m.elapsedMs)||m.elapsedMs<0){const f=failed(m);r.samples.push({phase,...f});Object.assign(r,f);break;}
   r.samples.push({phase,status:'ok',elapsedMs:m.elapsedMs});
   if(i+1<spec.warmup+spec.repetitions){try{await sleep(Math.max(0,Math.min(10,deadline-performance.now())),undefined,{signal});}catch{r.status='cancelled';break;}}
  }
  if(r.status==='pending')r.status='ok';return r;
 }catch{return Object.assign(r,{status:'error',reason:'controller-error'});}
 finally{if(channel)await channel.close();r.statistics=statistics(r.samples.filter(s=>s.phase==='measurement'&&s.status==='ok').map(s=>s.elapsedMs));}
}
export function sourceIdentity(cwd=fileURLToPath(new URL('.',import.meta.url))){
 const git=args=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:5000}).trim();let sha=null,dirty=null,fingerprint=null;
 try{sha=git(['rev-parse','HEAD']);dirty=!!git(['status','--porcelain','--untracked-files=normal']);}catch{}
 try{const names=readdirSync(cwd,{withFileTypes:true}).filter(e=>e.isFile()&&(/\.(js|mjs)$/.test(e.name)||['package.json','package-lock.json'].includes(e.name))).map(e=>e.name).sort();const manifest=names.map(name=>[name,createHash('sha256').update(readFileSync(join(cwd,name))).digest('hex')]);fingerprint={method:'sha256-source-manifest-v1',hash:createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),files:names.length};}catch{}
 return {sha,dirty,fingerprint};
}
export async function run(input={},options={}){
 const config=configuration(input),start=Date.now(),source=sourceIdentity(),deadline=performance.now()+config.maxRunMs,scenarios=[];let stopped=null;
 for(const spec of config.scenarios){
  if(stopped||options.signal?.aborted||performance.now()>=deadline){scenarios.push({id:spec.id,version:1,status:'skipped',reason:stopped??(options.signal?.aborted?'cancelled':'run-deadline'),samples:[],statistics:null});continue;}
  const r=await scenario(spec,{...options,deadline});scenarios.push(r);if(r.status!=='ok')stopped=r.status;
 }
 return {schemaVersion:1,runnerVersion:1,fixtureVersion:1,runId:randomUUID(),startedAt:new Date(start).toISOString(),durationMs:Date.now()-start,config,source,environment:{node:process.version,platform:process.platform,release:os.release(),arch:process.arch,cpuModel:os.cpus()[0]?.model??null},scope:'node-synthetic-computation',unavailable:['installed-site-version','browser','UI readiness','HTTP','server stages','memory','CPU usage'],status:options.signal?.aborted||stopped==='cancelled'?'cancelled':scenarios.every(s=>s.status==='ok')?'ok':'incomplete',scenarios};
}
export async function main(args=process.argv.slice(2)){
 if(args.length===1&&args[0]==='--help'){process.stdout.write('node perf_runner.mjs [--config local.json]\nContract: tools/cm6/PERFORMANCE.md\n');return 0;}
 const controller=new AbortController(),cancel=()=>controller.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 try{if(args.length!==0&&(args.length!==2||args[0]!=='--config'))throw Error('arguments');const report=await run(args.length?JSON.parse(readFileSync(args[1],'utf8')):{},{signal:controller.signal});process.stdout.write(JSON.stringify(report,null,2)+'\n');return report.status==='ok'?0:report.status==='cancelled'?130:1;}
 catch{process.stderr.write('Benchmark failed: configuration or runner error.\n');return 1;}
 finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=await main();
