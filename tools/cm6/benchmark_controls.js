import {createScreenWorkloadRegistry} from './benchmark_screen_registry.js';
import {datasetConfig} from './benchmark_fixtures.js';
import {LOAD_FIELDS,describeLoad,importLoadReport} from './benchmark_profiles.js';
export function installWorkloadControls(root=window){
 const attach=bridge=>{
  if(!bridge||typeof bridge.attach!=='function')return;
  bridge.attach(api=>{
   const {node:n,button,owner}=api,section=n('section',null,owner);section.id='benchmarkWorkloads';
   n('h3','Компоненты приложения: синтетический корпус',section);
   n('p','Эти действия используют настоящий parser и общий renderer графа, но данные создаются в памяти вкладки. Файлы на сервере, рабочая заметка и полноценный HTTP-путь индекса не используются.',section);
   const controls=n('fieldset',null,section),choices=n('div',null,controls),selected=new Map(),registry=createScreenWorkloadRegistry({root,components:root.WebVaultBenchmarkWorkloads});
   if(!registry.catalog.some(x=>x.id==='tree.dom.render'))n('p','Тестовое дерево недоступно: общий renderer не загружен. Сохранён прежний компонентный режим.',section);
   const all=[{id:'http.synthetic.read',label:'Защищённый синтетический HTTP-ответ'},...registry.catalog];
   for(const item of all){const label=n('label',null,choices);label.className='wv-benchmark-choice';const input=n('input',null,label);input.type='checkbox';input.checked=!['http.synthetic.read','graph.svg.first-frame'].includes(item.id);label.appendChild(owner.ownerDocument.createTextNode(item.label));selected.set(item.id,input);}
   for(const labelText of ['Файловое дерево через сервер — ещё не поддерживается','Открытие/сохранение тестовой заметки — ещё не поддерживается']){const label=n('label',null,choices),input=n('input',null,label);label.className='wv-benchmark-choice';input.type='checkbox';input.disabled=true;label.appendChild(owner.ownerDocument.createTextNode(labelText));}
   const grid=n('div',null,controls);grid.className='wv-benchmark-options';const inputs={};
   function number(key,labelText,min,max,value,parent=grid){const label=n('label',labelText,parent),input=n('input',null,label);input.type='number';input.min=min;input.max=max;input.value=String(value);input.required=true;input.addEventListener('input',updatePlan);inputs[key]=input;}
   number('notes','Заметок в корпусе (2–300)',2,300,100);number('linksPerNote','Связей на заметку (0–6, меньше числа заметок)',0,6,3);number('noteKiB','Размер каждой заметки, KiB (1–64)',1,64,4);number('seed','Seed корпуса',0,2147483647,1);number('repetitions','Измеряемые повторы компонентов (1–10)',1,10,3);number('warmup','Предварительные повторы компонентов (0–3)',0,3,1);number('timeoutMs','Лимит операции компонента, ms',1000,30000,10000);
   const plan=n('p','',controls);plan.setAttribute('aria-live','polite');
   n('p','Первый кадр означает корректный SVG и координаты после расчёта, не физический paint. Стабилизация: alpha≤0.01 и смещение≤1 SVG-единицы три tick подряд, максимум400 tick. Размер SVG записывается в результат. Разбор корпуса включает кооперативные паузы каждые8 заметок и проверку ссылок.',section);
   n('p','Режим графа: автоматический. Интерактивный режим (масштабирование, перемещение, перетаскивание узлов и подсветка при наведении) пока недоступен в этом запуске.',section);
   n('p','Ограничения индекса пока не повышаются. Для сотен/тысяч пользователей и узлов нельзя считать недоступный сценарий успешным.',section);
   const host=n('div',null,section);host.className='wv-benchmark-preview';host.hidden=true;host.setAttribute('aria-label','Изолированный тестовый граф');
   let enabled=false,running=false;const ids=()=>Array.from(selected).filter(([,i])=>i.checked).map(([id])=>id);
   function required(k){const x=inputs[k],v=x.value.trim()===''?NaN:Number(x.value);if(!Number.isInteger(v)||v<Number(x.min)||v>Number(x.max))throw Error('invalid_component_parameter');return v;}
   const dataset=()=>datasetConfig(Object.fromEntries(['notes','linksPerNote','noteKiB','seed'].map(k=>[k,required(k)])));
   function updatePlan(){try{const d=dataset();plan.textContent='Корпус: '+d.notes+' заметок, '+d.notes*d.linksPerNote+' связей, '+d.notes*d.noteKiB+' KiB текста. Это не число пользователей.';}catch{plan.textContent='Проверьте объём и сочетания параметров корпуса.';}run.disabled=!enabled||running||!ids().length;api.setHTTPVisible(selected.get('http.synthetic.read').checked);}
   const run=api.runButton('Запустить выбранные действия',()=>{
    const chosen=ids();if(!chosen.length)return;const local=chosen.filter(id=>id!=='http.synthetic.read');let data,parameters;try{if(local.length){data=dataset();parameters={repetitions:required('repetitions'),warmup:required('warmup'),timeoutMs:required('timeoutMs')};}}catch(e){api.message(e.message);return;}
    return api.run(async context=>{
     const results=[];let stopped=false;
     if(chosen.includes('http.synthetic.read')){const r=await context.executeHTTP();results.push({id:'http.synthetic.read',version:1,status:r.status,statistics:r.statistics,samples:r.samples,config:r.config,cleanup:r.cleanup});if(r.status!=='ok')stopped=true;}
     if(local.length){
      if(stopped)for(const id of local)results.push({id,version:1,status:'skipped',reason:'previous_scenario_failed',statistics:null,samples:[]});
      else{host.hidden=false;try{const r=await registry.execute({selected:local,dataset:data,...parameters},{host,signal:context.signal,authorize:context.authorize,onProgress:context.onProgress});results.push(...r.results);return {schemaVersion:1,batchId:r.batchId,scope:'browser-selected-synthetic-workloads',status:r.status==='ok'&&r.cleanup==='ok'&&results.every(x=>x.status==='ok')?'ok':context.signal.aborted?'cancelled':'incomplete',cleanup:r.cleanup,results,config:{http:chosen.includes('http.synthetic.read')?context.httpConfig:null,components:r.config},fixtureVersion:r.fixtureVersion,fixtureKey:r.fixtureKey,fixtureBytes:r.fixtureBytes,conditions:r.conditions,unavailable:r.unavailable};}finally{host.hidden=true;}}
     }
     return {schemaVersion:1,scope:'browser-selected-synthetic-workloads',status:results.every(x=>x.status==='ok')?'ok':context.signal.aborted?'cancelled':'incomplete',cleanup:results.some(x=>x.cleanup==='unconfirmed')?'unconfirmed':'ok',results};
    });
   });
   for(const input of selected.values())input.addEventListener('change',updatePlan);
   api.hideHTTPStart();
   const load=n('details',null,owner);n('summary','Независимые пользователи: внешний генератор',load);n('p','Этот профиль сейчас выполняет только http.synthetic.read под отдельными тестовыми учётками. Он не создаёт браузеры и не рисует несколько графов. Генератор запускается на тестовом ПК, не в IIS. Пароли в сайт не загружаются.',load);
   const loadControls=n('fieldset',null,load),loadInputs={},loadGrid=n('div',null,loadControls);loadGrid.className='wv-benchmark-options';
   const labels={users:'Одновременных тестовых пользователей',repetitions:'Измеряемых HTTP-запросов на пользователя',warmup:'Предварительных HTTP-запросов на пользователя',sizeKiB:'Текст HTTP-ответа, KiB',timeoutMs:'Таймаут HTTP-запроса, ms',rampMs:'Выход всех пользователей на нагрузку, ms',pacingMs:'Пауза между шагами пользователя, ms'};
   for(const f of LOAD_FIELDS){const label=n('label',labels[f.key],loadGrid),input=n('input',null,label);input.type='number';input.min=f.min;input.max=f.max;input.value=String(f.value);input.required=true;loadInputs[f.key]=input;}
   function profile(){return describeLoad(Object.fromEntries(Object.entries(loadInputs).map(([k,v])=>[k,v.value])),new URL('.',root.location.href).href);}
   const loadPlan=n('p','',loadControls);function refreshLoad(){try{loadPlan.textContent=profile().text;}catch(e){loadPlan.textContent=e.message;}}for(const input of Object.values(loadInputs))input.addEventListener('input',refreshLoad);
   button('Экспортировать профиль нагрузки',loadControls,()=>{try{api.download(profile().profile,'webvault-load-profile.json');}catch(e){api.message(e.message);}});
   n('p','Команда на тестовом ПК: node perf_multiuser.mjs --config <профиль.json> --actors <приватный-файл.json>. Нужны заранее созданные обычные учётки WVBench_* с выданным правом; JSON-файл с testOnly:true и массивом actors (login/password) хранится только локально вне Git. Не используйте рабочие учётки. Учитывайте существующий лимит входа по IP; генератор его не отключает и не повторяет неудачный вход.',load);
   const fileLabel=n('label','Импорт JSON-отчёта внешнего генератора (до2 MiB)',loadControls),file=n('input',null,fileLabel);file.type='file';file.accept='.json,application/json';
   let importEpoch=0;file.onchange=async()=>{const token=++importEpoch,current=api.capture();if(!file.files||!file.files[0])return;try{const item=file.files[0];if(item.size>2097152)throw Error('report_too_large');const text=await item.text();if(token!==importEpoch||!current())return;const r=importLoadReport(text,new URL('.',root.location.href).href);await api.presentImported(r,()=>token===importEpoch&&current());}catch(e){if(token===importEpoch&&current())api.message(e.message);}};
   updatePlan();refreshLoad();
   return {sync(state){enabled=state.canRun;running=state.running;owner.hidden=!enabled;controls.disabled=loadControls.disabled=!enabled||running;updatePlan();},clear(){importEpoch++;if(typeof registry.clear==='function')registry.clear();host.hidden=true;host.textContent='';file.value='';},element:section};
  });
 };
 root.WebVaultBenchmarkWorkloadInstaller=attach;if(root.WebVaultBenchmarkUI)attach(root.WebVaultBenchmarkUI);
}
