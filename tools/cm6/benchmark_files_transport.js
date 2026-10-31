// Preparation only: not wired into the benchmark screen or bundle.
// getContext() supplies {userId, csrf, epoch, isAdmin, mustChangePassword}.
// epoch must change across logout/login, even if the same user returns.
export function createBenchmarkFilesTransport({getContext,fetch:send,crypto}={}){
 if(typeof getContext!=='function'||typeof send!=='function'||!crypto||typeof crypto.getRandomValues!=='function')throw Error('invalid_transport');
 const first=getContext();
 if(!first||!Number.isInteger(first.userId)||first.userId<1||typeof first.csrf!=='string'||!first.csrf||!Number.isSafeInteger(first.epoch)||first.isAdmin!==false||first.mustChangePassword!==false)throw Error('invalid_context');
 const initial={userId:first.userId,csrf:first.csrf,epoch:first.epoch};
 const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
 const requestId=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 if(/^0{32}$/.test(requestId))throw Error('invalid_request_id');
 function sameContext(){try{const v=getContext();return !!v&&v.userId===initial.userId&&v.csrf===initial.csrf&&v.epoch===initial.epoch&&v.isAdmin===false&&v.mustChangePassword===false;}catch(e){return false;}}
 function guard(){if(!sameContext())throw Error('session_changed');}
 function integer(v,a,b){return Number.isInteger(v)&&v>=a&&v<=b;}
 function body(p){
  if(!p||typeof p!=='object'||Array.isArray(p)||p.requestId!==requestId)throw Error('invalid_parameter');
  const keys=p.action==='start'?['action','requestId','actors','sizeKiB','count']:p.action==='step'?['action','requestId','index']:['status','cancel'].includes(p.action)?['action','requestId']:null;
  if(!keys||Object.keys(p).length!==keys.length||Object.keys(p).some(k=>!keys.includes(k)))throw Error('invalid_parameter');
  if(p.action==='start'&&(!integer(p.actors,1,8)||!integer(p.sizeKiB,1,64)||!integer(p.count,1,13))||p.action==='step'&&!integer(p.index,0,12))throw Error('invalid_parameter');
  return JSON.stringify(p);
 }
 async function request(p,timeoutMs,signal){
  guard();const text=body(p);if(!integer(timeoutMs,1,30000)||!signal||typeof signal.addEventListener!=='function')throw Error('invalid_parameter');
  if(signal.aborted)throw Error('cancelled');
  const controller=new AbortController();let timer,listener;
  const stopped=new Promise((_,reject)=>{listener=()=>{controller.abort();reject(Error('cancelled'));};signal.addEventListener('abort',listener,{once:true});timer=setTimeout(()=>{controller.abort();reject(Error('request_timeout'));},timeoutMs);if(signal.aborted)listener();});
  const work=Promise.resolve().then(async()=>{
   guard();if(controller.signal.aborted)throw Error('cancelled');
   const response=await send('api/benchmark_files.ashx',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'X-WebVault-Request':'1','Content-Type':'application/json','X-CSRF-Token':initial.csrf},body:text,signal:controller.signal});
   guard();if(response.redirected)throw Error('unexpected_redirect');
   const raw=await response.text();guard();if(typeof raw!=='string'||raw.length>32768)throw Error('invalid_response');
   let result;try{result=JSON.parse(raw);}catch(e){throw Error('invalid_json');}
   if(!result||typeof result!=='object'||Array.isArray(result))throw Error('invalid_response');
   if(!response.ok||result.ok!==true)throw Error(typeof result.error==='string'&&/^[a-z_]{1,80}$/.test(result.error)?result.error:'http_error');
   return result;
  });
  try{const result=await Promise.race([work,stopped]);guard();return result;}
  catch(e){guard();if(signal.aborted)throw Error('cancelled');throw Error(e&&/^[a-z_]{1,80}$/.test(e.message||'')?e.message:'request_failed');}
  finally{clearTimeout(timer);signal.removeEventListener('abort',listener);}
 }
 return {requestId,request,sameContext};
}
