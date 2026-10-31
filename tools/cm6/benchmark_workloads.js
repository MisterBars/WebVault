import {loadIndexFromSource} from './note_index.js';
import {loadBenchmarkIndex} from './benchmark_index_source.js';
import {makeFixtures,verifyGraph} from './benchmark_fixtures.js';
import {mountGraphScene} from './graph_scene.js';
export const WORKLOADS=[
 {id:'markdown.references.batch',version:1,label:'Извлечь ссылки из синтетических заметок'},
 {id:'graph.model.build',version:1,label:'Построить модель связей'},
 {id:'graph.svg.first-frame',version:1,label:'Отобразить граф: первый валидный кадр'},
 {id:'graph.svg.settled',version:1,label:'Отобразить граф: завершение раскладки по критерию'}
];
export function workloadConfig(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['selected','repetitions','warmup','timeoutMs','dataset'].includes(k)))throw Error('invalid_workload_config');
 const selected=input.selected===undefined?WORKLOADS.map(s=>s.id):input.selected;if(!Array.isArray(selected)||!selected.length||new Set(selected).size!==selected.length||selected.some(id=>!WORKLOADS.some(s=>s.id===id)))throw Error('unsupported_workload');
 const c={repetitions:3,warmup:1,timeoutMs:10000,...input,selected:WORKLOADS.filter(s=>selected.includes(s.id)).map(s=>s.id)};
 for(const [k,min,max] of [['repetitions',1,10],['warmup',0,3],['timeoutMs',1000,30000]])if(!Number.isInteger(c[k])||c[k]<min||c[k]>max)throw Error('invalid_workload_config');return c;
}
function stats(a){if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),median=x=>x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2,m=median(s);return {unit:'ms',count:s.length,median:m,min:s[0],max:s.at(-1),mad:median(s.map(x=>Math.abs(x-m)).sort((x,y)=>x-y))};}
export function createWorkloadRunner({extractReferences,makeGraph,forces,loadIndex=loadIndexFromSource,clock=()=>performance.now(),raf=callback=>requestAnimationFrame(callback),cancelRaf=id=>cancelAnimationFrame(id),pause=ms=>new Promise(r=>setTimeout(r,ms)),makeBatchId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('')}){
 async function rendered(graph,fixture,host,signal,timeoutMs,settled){
  if(!host||!host.isConnected)throw Error('graph_host_unavailable');
  const doc=host.ownerDocument,svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 960 560');svg.setAttribute('class','wv-graph-svg');svg.setAttribute('aria-label','Синтетический тестовый граф');svg.style.width='100%';svg.style.height='320px';host.appendChild(svg);const geometry=svg.getBoundingClientRect();if(!(geometry.width>0&&geometry.height>0)){svg.remove();throw Error('graph_host_not_visible');}
  const viewport=doc.createElementNS(svg.namespaceURI,'g');svg.appendChild(viewport);let scene,frame=null,timer,abort,finished=false;
  const nodes=graph.nodes.map(n=>({...n})),edges=graph.edges.map(e=>({...e}));let ticks=0,stable=0;const previous=new Map();
  try{
   await new Promise((resolve,reject)=>{
    const finish=e=>{if(finished)return;finished=true;e?reject(e):resolve();};abort=()=>finish(Error('cancelled'));signal.addEventListener('abort',abort,{once:true});timer=setTimeout(()=>finish(Error('request_timeout')),timeoutMs);
    if(signal.aborted){abort();return;}
    try{scene=mountGraphScene({viewport,nodes,edges,forces,onFrame:()=>{
     if(finished||frame!==null)return;ticks++;let delta=0;for(const n of nodes){const p=previous.get(n.id);if(p)delta=Math.max(delta,Math.hypot(n.x-p.x,n.y-p.y));previous.set(n.id,{x:n.x,y:n.y});}
     if(settled){stable=scene&&scene.simulation.alpha()<=.01&&ticks>1&&delta<=1?stable+1:0;if(stable<3){if(ticks>=400)finish(Error('layout_not_settled'));return;}}
     frame=raf(()=>{frame=null;if(signal.aborted){abort();return;}if(!host.isConnected){finish(Error('graph_host_unavailable'));return;}
      if(nodes.some(n=>!Number.isFinite(n.x)||!Number.isFinite(n.y))||edges.some(e=>!Number.isFinite(e.source.x)||!Number.isFinite(e.source.y)||!Number.isFinite(e.target.x)||!Number.isFinite(e.target.y))||viewport.querySelectorAll('circle').length!==fixture.notes.length||viewport.querySelectorAll('line').length!==fixture.expectedEdges){finish(Error('incorrect_rendered_graph'));return;}
      finish();
     });
    }});}catch(e){finish(e);}
   });
   return {width:geometry.width,height:geometry.height,viewBox:'0 0 960 560',ticks,criterion:settled?'alpha<=0.01,delta<=1 SVG unit for 3 ticks,cap400':'one valid tick and following animation callback'};
  }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);if(frame!==null)cancelRaf(frame);if(scene)scene.dispose();svg.remove();}
 }
 return {catalog:WORKLOADS,async execute(input,{signal,host,authorize,onProgress}){
  if(typeof authorize!=='function')throw Error('authorization_callback_required');
  const c=workloadConfig(input),fixture=makeFixtures(c.dataset),start=clock(),results=[],batchId=makeBatchId();let stopped=null,completed=0;
  const total=c.selected.length*(c.warmup+c.repetitions);
  function emit(stage,id,index,phase,status){if(typeof onProgress!=='function')return;try{onProgress({stage,id,index,phase,status,completed,total});}catch(ignore){}}
  const report={schemaVersion:1,batchId,scope:'browser-synthetic-components',config:{...c,dataset:fixture.config},fixtureVersion:fixture.version,fixtureKey:fixture.key,fixtureBytes:fixture.bytes,conditions:{graphIndexSource:'memory',sharedIndexLoaderVersion:1,indexPreparationExcluded:true,pacingMs:50,parseYieldEvery:8,includesValidation:true,renderModelPreparationExcluded:true},results,unavailable:['server note reads','server writes','full index HTTP path','physical paint','CPU','memory','concurrent users']};
  emit('starting',null,null,null,null);
  for(const id of c.selected){
   const row={id,version:1,status:'pending',samples:[],statistics:null};results.push(row);
   if(stopped||signal.aborted){row.status='skipped';row.reason=stopped??'cancelled';continue;}
   try{
    for(let i=0;i<c.warmup+c.repetitions;i++){
     if(signal.aborted)throw Error('cancelled');if(clock()-start>=120000)throw Error('run_timeout');await authorize();if(signal.aborted)throw Error('cancelled');if(clock()-start>=120000)throw Error('run_timeout');
     const phase=i<c.warmup?'warmup':'measurement';emit('step-start',id,i,phase,null);if(signal.aborted)throw Error('cancelled');if(clock()-start>=120000)throw Error('run_timeout');
     let indexNotes=fixture.notes;if(id.startsWith('graph.')){const began=clock(),check=()=>{if(signal.aborted)throw Error('cancelled');if(clock()-start>=120000)throw Error('run_timeout');};const indexed=await loadBenchmarkIndex(fixture,{loadIndex,signal,check,pause});check();indexNotes=indexed.notes;(row.indexPreparation??=[]).push({phase,elapsedMs:clock()-began,...indexed.statistics});}
     const prepared=id.startsWith('graph.svg.')?makeGraph(indexNotes):null;if(prepared)verifyGraph(prepared,fixture);
     const t=clock();
     try{
      if(id==='markdown.references.batch'){
       for(let j=0;j<fixture.notes.length;j++){
        if(signal.aborted)throw Error('cancelled');const note=fixture.notes[j],refs=extractReferences(note.text);if(JSON.stringify(refs)!==JSON.stringify(note.refs))throw Error('incorrect_references');
        if((j+1)%8===0)await pause(0);if(clock()-t>c.timeoutMs)throw Error('request_timeout');
       }
      }else if(id==='graph.model.build'){verifyGraph(makeGraph(indexNotes),fixture);}
      else {const geometry=await rendered(prepared,fixture,host,signal,Math.min(c.timeoutMs,Math.max(1,120000-(clock()-start))),id==='graph.svg.settled');if(row.renderGeometry&&(row.renderGeometry.width!==geometry.width||row.renderGeometry.height!==geometry.height))throw Error('render_geometry_changed');row.renderGeometry=geometry;}
      const elapsedMs=clock()-t;if(signal.aborted)throw Error('cancelled');if(elapsedMs>c.timeoutMs||clock()-start>=120000)throw Error('request_timeout');
      await authorize();if(signal.aborted)throw Error('cancelled');if(clock()-start>=120000)throw Error('run_timeout');row.samples.push({phase,status:'ok',elapsedMs});completed++;emit('step-end',id,i,phase,'ok');
     }catch(e){row.samples.push({phase,status:signal.aborted?'cancelled':e.message==='request_timeout'||e.message==='run_timeout'?'timeout':'error'});emit('step-end',id,i,phase,row.samples[row.samples.length-1].status);throw e;}
     if(i+1<c.warmup+c.repetitions)await pause(50);
    }row.status='ok';
   }catch(e){row.status=signal.aborted?'cancelled':e.message==='request_timeout'||e.message==='run_timeout'?'timeout':'error';row.reason=/^[a-z_]+$/.test(e.message)?e.message:'workload_failed';stopped=row.status;}
   row.statistics=stats(row.samples.filter(s=>s.phase==='measurement'&&s.status==='ok').map(s=>s.elapsedMs));
  }
  emit('cleanup',null,null,null,null);
  report.status=signal.aborted?'cancelled':results.every(r=>r.status==='ok')?'ok':'incomplete';report.cleanup='ok';emit('finished',null,null,null,report.status);return report;
 }};
}
