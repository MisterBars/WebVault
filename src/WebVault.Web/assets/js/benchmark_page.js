(function(){'use strict';
var csrf=null,user=null,users=[],controller=null,report=null,el=function(id){return document.getElementById(id);},status=function(text){el('benchmarkStatus').textContent=text;};
async function requestAt(url,data,timeout,signal){
 var ac=new AbortController(),expired=false,abort=function(){ac.abort();},timer=setTimeout(function(){expired=true;ac.abort();},timeout);
 signal.addEventListener('abort',abort,{once:true});if(signal.aborted)ac.abort();
 try{
  var headers={'X-WebVault-Request':'1'},options={method:data===null?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:headers,signal:ac.signal};
  if(data!==null){headers['Content-Type']='application/json';headers['X-CSRF-Token']=csrf;options.body=JSON.stringify(data);}
  var r=await fetch(url,options),body;try{body=await r.json();}catch(e){throw Error('invalid_json_response');}
  if(!r.ok||body.ok!==true)throw Error(typeof body.error==='string'&&/^[a-z_]+$/.test(body.error)?body.error:'http_error');return body;
 }catch(e){if(expired)throw Error('request_timeout');throw e;}
 finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
}
function request(data,timeout,signal){return requestAt('api/benchmark.ashx',data,timeout,signal);}
async function list(){var b=await requestAt('api/admin/user_manage.ashx',null,10000,new AbortController().signal);users=b.users.filter(function(u){return !u.isAdmin&&u.isActive&&!u.isDeleted;});el('benchmarkUsers').textContent='';users.forEach(function(u,i){var option=document.createElement('option');option.value=String(i);option.textContent=u.login+' · '+u.displayName;el('benchmarkUsers').appendChild(option);});}
async function grant(enabled){var target=users[Number(el('benchmarkUsers').value)];if(!target)throw Error('select_user');await request({action:'grant',userId:target.id,rowVersion:target.rowVersion,enabled:enabled},10000,new AbortController().signal);await list();status(enabled?'Право выдано. Пользователь открывает benchmark.html в новой вкладке.':'Право отозвано. Старые запуски не возобновляются после повторной выдачи.');}
function action(work){return function(){Promise.resolve().then(work).catch(function(e){status(e.message);});};}
el('benchmarkRefresh').onclick=action(list);el('benchmarkGrant').onclick=action(function(){return grant(true);});el('benchmarkRevoke').onclick=action(function(){return grant(false);});
el('benchmarkForm').onsubmit=function(event){event.preventDefault();if(controller)return;var f=this,input={};['repetitions','warmup','sizeKiB','timeoutMs'].forEach(function(k){input[k]=Number(f.elements[k].value);});try{WebVaultBenchmarkCore.config(input);}catch(e){status(e.message);return;}
 controller=new AbortController();el('benchmarkStart').disabled=true;el('benchmarkCancel').disabled=false;el('benchmarkExport').disabled=true;report=null;el('benchmarkResult').textContent='';status('Запуск. Не закрывайте вкладку до завершения.');
 WebVaultBenchmarkCore.execute(input,request,controller.signal,function(){return performance.now();}).then(function(r){r.environment={browser:navigator.userAgent,installedBenchmarkVersion:1,sourceMainSha:null};report=r;el('benchmarkResult').textContent=JSON.stringify(r,null,2);el('benchmarkExport').disabled=false;status('Завершение: '+r.status+'; очистка: '+r.cleanup);}).catch(function(e){status(e.message);}).finally(function(){controller=null;el('benchmarkStart').disabled=false;el('benchmarkCancel').disabled=true;});
};
el('benchmarkCancel').onclick=function(){if(controller)controller.abort();};
el('benchmarkExport').onclick=function(){if(!report)return;var url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='webvault-http-benchmark-'+(report.runId||'incomplete')+'.json';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);};
window.addEventListener('beforeunload',function(e){if(controller){e.preventDefault();e.returnValue='';}});
action(async function(){var me=await requestAt('api/auth/me.ashx',null,10000,new AbortController().signal);user=me.user;csrf=me.csrfToken;el('benchmarkIdentity').textContent=user.displayName+' ('+user.login+')';var b=await request({action:'status'},10000,new AbortController().signal);el('benchmarkAdmin').hidden=!b.canGrant;el('benchmarkUser').hidden=!b.canRun;if(b.canGrant)await list();status(b.canRun?'Готово к запуску.':(b.canGrant?'Выберите пользователя для выдачи/отзыва права.':'Право не выдано. Обратитесь к администратору.'));})();
}());
