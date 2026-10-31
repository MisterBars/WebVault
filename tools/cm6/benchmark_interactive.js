import {createWorkloadRunner as createAutomaticRunner,workloadConfig} from './benchmark_workloads.js';
import {makeFixtures,verifyGraph} from './benchmark_fixtures.js';
import {loadIndexFromSource} from './note_index.js';
import {loadBenchmarkIndex} from './benchmark_index_source.js';
import {mountGraphScene} from './graph_scene.js';
import {createGraphInteraction} from './graph_interaction.js';
export const INTERACTIVE_ID='graph.svg.interactive';
const required=s=>s.zoomEvents>0&&s.panGestures>0&&s.nodeDrags>0&&s.hoverEvents>0;
function statistics(values){if(!values.length)return null;const a=values.slice().sort((x,y)=>x-y),median=x=>x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2,m=median(a);return {unit:'ms',count:a.length,median:m,min:a[0],max:a.at(-1),mad:median(a.map(x=>Math.abs(x-m)).sort((x,y)=>x-y))};}
export function createWorkloadRunner(options){
 const automatic=createAutomaticRunner(options),{makeGraph,forces,loadIndex=loadIndexFromSource,prepareIndex=loadBenchmarkIndex,clock=()=>performance.now(),raf=f=>requestAnimationFrame(f),cancelRaf=id=>cancelAnimationFrame(id),pause=ms=>new Promise(r=>setTimeout(r,ms)),setTimer=setTimeout,clearTimer=clearTimeout,makeBatchId=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('')}=options;
 async function sceneCheck(graph,fixture,host,signal,until,check,cleanupError){
  if(!host?.isConnected)throw Error('graph_host_unavailable');
  const doc=host.ownerDocument,svg=doc.createElementNS('http://www.w3.org/2000/svg','svg'),prompt=doc.createElement('p');
  prompt.textContent='Ручная проверка: измените масштаб колесом, переместите фон, перетащите узел больше чем на 4 SVG-единицы и наведите указатель на узел. После четырёх действий повтор завершится. Клики не открывают заметки.';
  svg.setAttribute('viewBox','0 0 960 560');svg.setAttribute('class','wv-graph-svg');svg.setAttribute('aria-label','Ручная проверка синтетического графа');svg.style.width='100%';svg.style.height='320px';
  const viewport=doc.createElementNS(svg.namespaceURI,'g');svg.appendChild(viewport);
  const nodes=graph.nodes.map(n=>({...n})),edges=graph.edges.map(e=>({...e}));let scene=null,interaction=null,frame=null,timer=null,abort=null,done=false,ready=false,ticks=0,failure=null,geometry=null,snapshot=null;
  function bounds(){if(!host.isConnected)throw Error('graph_host_unavailable');const r=svg.getBoundingClientRect();if(!(r.width>0&&r.height>0))throw Error('graph_host_not_visible');return {width:r.width,height:r.height};}
  try{
   host.appendChild(prompt);host.appendChild(svg);geometry=bounds();
   await new Promise((resolve,reject)=>{
    const finish=e=>{if(done)return;done=true;e?reject(e):resolve();};abort=()=>finish(Error('cancelled'));signal.addEventListener('abort',abort,{once:true});
    try{
     check();if(clock()>=until)throw Error('interaction_not_completed');
     scene=mountGraphScene({viewport,nodes,edges,forces,onFrame:()=>{if(!done)ticks++;},onEnter:n=>interaction?.enter(n),onLeave:()=>interaction?.leave(),onVisit:n=>interaction?.activate(n)});
     interaction=createGraphInteraction({svg,viewport,getNodes:()=>nodes,getEdges:()=>edges,getSimulation:()=>scene.simulation,isActive:()=>ready&&!done&&!signal.aborted&&host.isConnected});
     function poll(){frame=null;if(done)return;try{check();if(clock()>=until)throw Error('interaction_not_completed');const g=bounds();if(g.width!==geometry.width||g.height!==geometry.height)throw Error('render_geometry_changed');
      if(ticks>0){if(nodes.some(n=>!Number.isFinite(n.x)||!Number.isFinite(n.y))||edges.some(e=>!Number.isFinite(e.source.x)||!Number.isFinite(e.source.y)||!Number.isFinite(e.target.x)||!Number.isFinite(e.target.y))||viewport.querySelectorAll('circle').length!==fixture.notes.length||viewport.querySelectorAll('line').length!==fixture.expectedEdges)throw Error('incorrect_rendered_graph');ready=true;if(required(interaction.snapshot())){finish();return;}}
      frame=raf(poll);
     }catch(e){finish(e);}}
     timer=setTimer(()=>{try{check();finish(Error('interaction_not_completed'));}catch(e){finish(e);}},Math.max(1,until-clock()));frame=raf(poll);
    }catch(e){finish(e);}
   });
  }catch(e){failure=e;}
  finally{done=true;if(timer!==null)clearTimer(timer);if(abort)signal.removeEventListener('abort',abort);if(frame!==null)cancelRaf(frame);try{interaction?.dispose();}catch(e){cleanupError();}snapshot=interaction?.snapshot()||null;try{scene?.dispose();}catch(e){cleanupError();}finally{svg.remove();prompt.remove();}}
  if(failure){failure.interactions=snapshot;throw failure;}
  return {geometry:{...geometry,viewBox:'0 0 960 560',ticks,criterion:'valid_frame_and_completed_zoom_pan_drag_hover'},interactions:snapshot};
 }
 async function executeInteractive(input,{signal,host,authorize,onProgress,deadline:outerDeadline}={}){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('invalid_workload_config');
  if(input.selected!==undefined&&(!Array.isArray(input.selected)||input.selected.length!==1||input.selected[0]!==INTERACTIVE_ID))throw Error('unsupported_workload');
  const c=workloadConfig({...input,selected:['graph.svg.first-frame']});c.selected=[INTERACTIVE_ID];
  if(!signal||typeof signal.addEventListener!=='function'||typeof authorize!=='function')throw Error('workload_context_required');if(outerDeadline!==undefined&&!Number.isFinite(outerDeadline))throw Error('invalid_deadline');
  const start=clock(),deadline=Math.min(start+120000,outerDeadline??Infinity),fixture=makeFixtures(c.dataset),total=c.warmup+c.repetitions,row={id:INTERACTIVE_ID,version:1,renderMode:'interactive',timing:'human_interaction_completion',status:'pending',samples:[],statistics:null,indexPreparation:[]};let completed=0,cleanup='ok';
  const emit=(stage,index=null,phase=null,status=null)=>{try{onProgress?.({stage,id:INTERACTIVE_ID,index,phase,status,completed,total});}catch(ignore){}};
  const check=()=>{if(signal.aborted)throw Error('cancelled');if(clock()>=deadline)throw Error('run_timeout');};
  async function permission(){check();const rights=await authorize(signal);check();if(rights===false||rights?.canRun===false)throw Error('benchmark_permission_required');}
  const state=e=>signal.aborted?'cancelled':['request_timeout','run_timeout','interaction_not_completed'].includes(e?.message)?'timeout':'error';
  emit('starting');
  try{for(let i=0;i<total;i++){
   await permission();const phase=i<c.warmup?'warmup':'measurement';emit('step-start',i,phase);check();
   const began=clock(),indexed=await prepareIndex(fixture,{loadIndex,signal,check,pause});check();row.indexPreparation.push({phase,elapsedMs:clock()-began,...indexed.statistics});const graph=makeGraph(indexed.notes);verifyGraph(graph,fixture);check();const t=clock();let result;
   try{result=await sceneCheck(graph,fixture,host,signal,Math.min(t+c.timeoutMs,deadline),check,()=>{cleanup='unconfirmed';});const elapsedMs=clock()-t;check();if(elapsedMs>c.timeoutMs)throw Error('interaction_not_completed');await permission();if(row.renderGeometry&&(row.renderGeometry.width!==result.geometry.width||row.renderGeometry.height!==result.geometry.height))throw Error('render_geometry_changed');row.renderGeometry=result.geometry;row.samples.push({phase,status:'ok',elapsedMs,interactions:result.interactions});completed++;emit('step-end',i,phase,'ok');}
   catch(e){row.samples.push({phase,status:state(e),interactions:e.interactions||result?.interactions||null});emit('step-end',i,phase,state(e));throw e;}
   if(i+1<total){check();await pause(50);check();}
  }row.status='ok';}catch(e){row.status=state(e);row.reason=/^[a-z_]+$/.test(e?.message)?e.message:'interaction_failed';}
  row.statistics=statistics(row.samples.filter(s=>s.phase==='measurement'&&s.status==='ok').map(s=>s.elapsedMs));emit('cleanup');
  const report={schemaVersion:1,batchId:makeBatchId(),scope:'browser-synthetic-graph-interaction',status:signal.aborted?'cancelled':row.status==='ok'&&cleanup==='ok'?'ok':'incomplete',cleanup,results:[row],config:{...c,dataset:fixture.config},fixtureVersion:fixture.version,fixtureKey:fixture.key,fixtureBytes:fixture.bytes,conditions:{renderMode:'interactive',interactionDriver:'manual',timing:'human_interaction_completion',requiredActions:['zoom','pan','drag','hover'],graphIndexSource:'memory',sharedIndexLoaderVersion:1,indexPreparationExcluded:true,renderModelPreparationExcluded:true,physicalPaintVerified:false,pacingMs:50},unavailable:['server note reads','server writes','full index HTTP path','physical paint','CPU','memory','concurrent users']};emit('finished',null,null,report.status);return report;
 }
 return {...automatic,executeInteractive};
}
