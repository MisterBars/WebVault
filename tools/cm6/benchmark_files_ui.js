export function fileCycleReport(report){
 const rows=[['http','server.files.cycle.http','Файловый цикл: HTTP с проверкой ответа'],['server','server.files.cycle.server','Файловый цикл: серверное время']].map(([key,id,label])=>({id,label,version:1,status:report.status,cleanup:report.cleanup,statistics:report.statistics[key]}));
 return {...report,scope:'server-files-cycle-over-http',results:rows};
}
export function installFileCycleControls(api,root,{core,createTransport}){
 const section=api.node('section',null,api.owner);section.id='benchmarkFileCycle';
 api.node('h3','Изолированный файловый цикл на сервере',section);
 api.node('p','Создание, проверенное чтение, замена и удаление синтетических файлов. Рабочие заметки не используются. Псевдохранилища не являются одновременными пользователями. Маршрут должен быть отдельно включён на тестовом стенде.',section);
 const controls=api.node('fieldset',null,section),grid=api.node('div',null,controls);grid.className='wv-benchmark-options';
 const inputs={},fields=[['actors','Псевдохранилищ (1–8)',1,8,2],['sizeKiB','Размер файла, KiB (1–64)',1,64,1],['repetitions','Измеряемых циклов (1–13)',1,13,3],['warmup','Циклов прогрева (0–12)',0,12,1],['timeoutMs','Таймаут запроса, ms',1000,30000,10000]];
 for(const [key,label,min,max,value] of fields){const l=api.node('label',label,grid),i=api.node('input',null,l);Object.assign(i,{type:'number',min:String(min),max:String(max),value:String(value),required:true});i.addEventListener('input',refresh);inputs[key]=i;}
 const plan=api.node('p','',controls);plan.setAttribute('aria-live','polite');
 api.node('p','Сумма прогрева и измерений — не больше 13. HTTP-время и серверное время показываются отдельно. Прогрев не входит в статистику. Потерянный ответ не повторяется ради замера; неподтверждённая очистка исключает общий успех.',section);
 let enabled=false,running=false,run=null;
 function central(){return !!root.WebVaultWorkspace&&root.WebVaultWorkspace.active==='benchmark';}
 function configuration(){return core.config(Object.fromEntries(Object.entries(inputs).map(([k,i])=>[k,i.value.trim()===''?NaN:Number(i.value)])));}
 function refresh(){let valid=true;try{const c=configuration();plan.textContent='План: '+(c.repetitions+c.warmup)+' циклов × '+c.actors+' псевдохранилищ; '+c.sizeKiB+' KiB на файл. Это не число пользователей.';}catch(e){valid=false;plan.textContent='Проверьте целые значения и сумму циклов: не больше 13.';}section.hidden=!enabled||!central();if(run){run.hidden=section.hidden;run.disabled=!enabled||running||!valid||!central();}}
 run=api.runButton('Запустить файловый цикл',()=>{
  if(!enabled||running||!central())return;let config;try{config=configuration();}catch(e){api.message('Проверьте параметры файлового цикла.');return;}
  const current=api.capture();
  return api.run(async context=>{
   if(!current()||context.signal.aborted)throw Error('cancelled');
   const getContext=()=>{const u=root.WebVaultCore.state.user;return {userId:u?u.id:null,csrf:root.WebVaultCore.state.csrf,epoch:current()?1:0,isAdmin:u?u.isAdmin:true,mustChangePassword:u?u.mustChangePassword:true};};
   const transport=createTransport({getContext,fetch:root.fetch.bind(root),crypto:root.crypto});
   const report=await core.execute(config,transport.request,{requestId:transport.requestId,sameContext:transport.sameContext,signal:context.signal,crypto:root.crypto,clock:()=>root.performance.now()});
   if(!current())throw Error('session_changed');return fileCycleReport(report);
  });
 });
 refresh();
 return {sync(state){enabled=state.canRun;running=state.running;controls.disabled=!enabled||running;refresh();},clear(){enabled=false;running=false;refresh();}};
}
