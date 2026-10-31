import {createBenchmarkWorkloadRegistry} from './benchmark_workload_registry.js';
import {createTreeWorkloadRunner} from './benchmark_tree_workloads.js';
import {renderBenchmarkTree} from './benchmark_tree.js';
import {makeFixtures} from './benchmark_fixtures.js';

export function createScreenWorkloadRegistry({root,components}){
 const renderer=root.WebVaultFileTreeView;
 if(renderer?.apiVersion!==1||typeof renderer.createButton!=='function')return components;
 let host=null,preview=null,busy=false,generation=0;
 function disposePreview(){if(preview){preview.dispose();preview=null;}}
 function clear(){generation++;disposePreview();if(host){host.remove();host=null;}}
 function mount(graphHost){
  const doc=graphHost?.ownerDocument;if(!doc)throw Error('graph_host_unavailable');
  const target=doc.querySelector?.('#benchmarkWorkspacePane .wv-benchmark-tree');
  const bounds=target?.getBoundingClientRect();
  const aside=bounds?.width>0&&bounds?.height>0?target:null;
  host=doc.createElement('div');host.className='wv-benchmark-tree-preview';
  host.style.height=aside?'100%':'320px';host.style.minHeight='240px';host.style.overflow='auto';
  if(aside){aside.textContent='';aside.removeAttribute('title');aside.appendChild(host);}
  else if(graphHost.parentNode)graphHost.parentNode.insertBefore(host,graphHost);
  else throw Error('tree_host_unavailable');
 }
 function show(notes){disposePreview();preview=renderBenchmarkTree({host,notes,createButton:renderer.createButton});}
 const measured=createTreeWorkloadRunner({createButton:renderer.createButton});
 return {catalog:[...measured.catalog,...components.catalog],clear,async execute(input,options){
  if(busy)throw Error('benchmark_busy');busy=true;
  clear();const token=generation,signal=options.signal;let abort;
  try{
   if(!signal||typeof options.authorize!=='function')throw Error('workload_context_required');
   const current=()=>token===generation&&!signal.aborted;
   const permission=async childSignal=>{if(!current()||childSignal?.aborted)throw Error('cancelled');const rights=await options.authorize(childSignal||signal);if(!current()||childSignal?.aborted)throw Error('cancelled');if(rights===false||rights?.canRun===false)throw Error('benchmark_permission_required');return rights;};
   const tree={...measured,async execute(config,context){
    disposePreview();const report=await measured.execute(config,context);
    if(current()&&report.status==='ok'&&report.cleanup==='ok')show(makeFixtures(config.dataset).notes);
    return report;
   }};
   const combined=createBenchmarkWorkloadRegistry({tree,components}),config=combined.configure(input);
   await permission(signal);mount(options.host);
   abort=()=>{disposePreview();if(host){host.remove();host=null;}};signal.addEventListener('abort',abort,{once:true});
   if(!current())throw Error('cancelled');
   if(!config.selected.some(id=>measured.catalog.some(x=>x.id===id)))show(makeFixtures(config.dataset).notes);
   const bytes=new Uint8Array(16);root.crypto.getRandomValues(bytes);const batchId=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
   const report=await combined.execute(config,{...options,treeHost:host,authorize:permission});
   if(!current()||report.status!=='ok'||report.cleanup!=='ok')abort();
   return {...report,batchId};
  }catch(e){disposePreview();if(host){host.remove();host=null;}throw e;}
  finally{if(signal&&abort)signal.removeEventListener('abort',abort);busy=false;}
 }};
}
