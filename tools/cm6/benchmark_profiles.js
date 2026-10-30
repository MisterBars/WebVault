const KEYS=['users','repetitions','warmup','sizeKiB','timeoutMs','rampMs','pacingMs'];
const RANGES={users:[1,16,2],repetitions:[1,100,30],warmup:[0,10,3],sizeKiB:[1,256,64],timeoutMs:[1000,30000,5000],rampMs:[0,30000,1000],pacingMs:[50,5000,50]};
export const LOAD_FIELDS=KEYS.map(key=>({key,min:RANGES[key][0],max:RANGES[key][1],value:RANGES[key][2]}));
function fail(code){throw Error(code);}
function object(v){if(!v||typeof v!=='object'||Array.isArray(v))fail('invalid_report');}
function fields(v,allowed){object(v);if(Object.keys(v).some(k=>!allowed.includes(k)))fail('unexpected_report_fields');}
function int(v,min,max){if(!Number.isInteger(v)||v<min||v>max)fail('invalid_profile_parameter');return v;}
function finite(v,min=0,max=Number.MAX_VALUE){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail('invalid_report_number');return v;}
function target(value){let u;try{u=new URL(value);}catch{fail('invalid_target');}if(u.username||u.password||u.search||u.hash||!u.pathname.endsWith('/')||!['http:','https:'].includes(u.protocol)||(u.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(u.hostname)))fail('invalid_target');return u.href;}
export function createLoadProfile(values,baseURL){
 fields(values,KEYS);const p={baseURL:target(baseURL)};
 for(const k of KEYS){const raw=values[k],v=typeof raw==='string'&&raw.trim()!==''?Number(raw):raw;p[k]=int(v,RANGES[k][0],RANGES[k][1]);}return p;
}
export function describeLoad(values,baseURL){const p=createLoadProfile(values,baseURL),steps=p.users*(p.repetitions+p.warmup);return {profile:p,steps,textBytes:steps*p.sizeKiB*1024,text:p.users+' независимых тестовых сессий; '+steps+' HTTP-шагов; только http.synthetic.read. Граф и заметки этот профиль не выполняет.'};}
function statistics(values){if(!values.length)return null;const a=values.slice().sort((x,y)=>x-y),median=v=>v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2,m=median(a),r={unit:'ms',count:a.length,median:m,min:a[0],max:a.at(-1),mad:median(a.map(x=>Math.abs(x-m)).sort((x,y)=>x-y))};if(a.length>=100){r.p95=a[Math.ceil(.95*a.length)-1];r.p95Method='nearest-rank';}return r;}
export function importLoadReport(text,baseURL){
 if(typeof text!=='string'||text.length>2097152)fail('report_too_large');let r;try{r=JSON.parse(text);}catch{fail('invalid_report_json');}
 fields(r,['schemaVersion','jobId','scope','scenario','scenarioVersion','fixtureVersion','config','agent','actors','unavailable','plannedSteps','plannedTextBytes','phaseElapsedMs','statistics','status','successfulSteps','peakClientInFlight','terminationReason','error']);
 if(r.schemaVersion!==1||r.scope!=='node-independent-test-sessions-http-synthetic'||r.scenario!=='http.synthetic.read'||r.scenarioVersion!==1||r.fixtureVersion!==1||typeof r.jobId!=='string'||!/^[a-f0-9]{32}$/.test(r.jobId))fail('load_report_required');
 fields(r.config,['baseURL',...KEYS]);const values={};for(const k of KEYS)values[k]=r.config[k];const p=createLoadProfile(values,r.config.baseURL);if(p.baseURL!==target(baseURL))fail('report_target_mismatch');
 if(!Array.isArray(r.actors)||r.actors.length>p.users)fail('invalid_actor_count');const seen=new Set();let successful=0;
 const actors=r.actors.map(a=>{
  fields(a,['actor','status','samples','cleanup','logout','reason','statistics']);int(a.actor,1,p.users);if(seen.has(a.actor))fail('duplicate_actor');seen.add(a.actor);
  if(!['ok','incomplete','error','timeout','cancelled','not_executed'].includes(a.status)||!['ok','not_needed','unconfirmed'].includes(a.cleanup)||!['ok','already_ended','unconfirmed'].includes(a.logout)||!Array.isArray(a.samples)||a.samples.length>p.repetitions+p.warmup)fail('invalid_actor_result');
  const samples=a.samples.map((s,i)=>{fields(s,['phase','status','elapsedMs','reason']);if(s.phase!==(i<p.warmup?'warmup':'measurement')||!['ok','error','timeout','cancelled'].includes(s.status))fail('invalid_sample');const out={phase:s.phase,status:s.status};if(s.status==='ok'){out.elapsedMs=finite(s.elapsedMs,0,p.timeoutMs);successful++;}else if(s.reason!==undefined){if(typeof s.reason!=='string'||!/^[a-z_]{1,80}$/.test(s.reason))fail('invalid_sample_reason');out.reason=s.reason;}return out;});
  if(a.status==='ok'&&(samples.length!==p.repetitions+p.warmup||samples.some(s=>s.status!=='ok')||a.cleanup!=='ok'||a.logout==='unconfirmed'))fail('incorrect_success_status');
  const out={actor:a.actor,status:a.status,samples,cleanup:a.cleanup,logout:a.logout,statistics:statistics(samples.filter(s=>s.phase==='measurement'&&s.status==='ok').map(s=>s.elapsedMs))};
  if(a.reason!==undefined){if(typeof a.reason!=='string'||!/^[a-z_]{1,80}$/.test(a.reason))fail('invalid_actor_reason');out.reason=a.reason;}return out;
 });
 if(!['ok','incomplete','cancelled'].includes(r.status)||r.plannedSteps!==p.users*(p.repetitions+p.warmup)||r.plannedTextBytes!==r.plannedSteps*p.sizeKiB*1024||r.successfulSteps!==successful)fail('invalid_aggregate');
 if(r.status==='ok'&&(actors.length!==p.users||actors.some(a=>a.status!=='ok')||r.error||r.terminationReason))fail('incorrect_success_status');
 fields(r.agent,['node','platform','arch']);for(const k of ['node','platform','arch']){const v=r.agent[k];if(typeof v!=='string'||!/^[A-Za-z0-9_.-]{1,64}$/.test(v))fail('invalid_agent');}
 if(successful>0&&!(r.phaseElapsedMs>0))fail('invalid_report_duration');
 const result={schemaVersion:1,jobId:r.jobId,scope:r.scope,scenario:r.scenario,scenarioVersion:1,fixtureVersion:1,imported:true,executionVerified:false,config:p,agent:{node:r.agent.node,platform:r.agent.platform,arch:r.agent.arch},actors,status:r.status,plannedSteps:r.plannedSteps,plannedTextBytes:r.plannedTextBytes,successfulSteps:successful,peakClientInFlight:int(r.peakClientInFlight,0,p.users),phaseElapsedMs:r.phaseElapsedMs===null?null:finite(r.phaseElapsedMs),statistics:statistics(actors.flatMap(a=>a.samples.filter(s=>s.phase==='measurement'&&s.status==='ok').map(s=>s.elapsedMs))),unavailable:['real note operations','graph rendering','browser UI','server stages','CPU','memory']};
 for(const k of ['terminationReason','error'])if(r[k]!==undefined){if(r[k]!==null&&(typeof r[k]!=='string'||!/^[a-z_]{1,80}$/.test(r[k])))fail('invalid_report_reason');result[k]=r[k];}return result;
}
