import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkloadRunner} from './benchmark_workloads.js';
function model(notes){return {nodes:notes.map(n=>({id:n.path,path:n.path,label:n.path.split('/').pop().slice(0,-3),status:'resolved',version:n.version})),edges:notes.flatMap(n=>n.refs.map(r=>({source:n.path,target:r.target.slice(1),count:1})))};}
async function execute({lateCall=0,end=119999,abort=false}={}){
 let now=0,calls=0,builds=0;const controller=new AbortController();
 const runner=createWorkloadRunner({extractReferences:()=>[],makeGraph:notes=>{builds++;return model(notes);},forces:{},clock:()=>now,makeBatchId:()=> 'a'.repeat(32)});
 const report=await runner.execute({selected:['graph.model.build'],repetitions:1,warmup:0,dataset:{notes:2,linksPerNote:1,noteKiB:1}},{signal:controller.signal,authorize:async()=>{calls++;if(calls===lateCall){now=end;if(abort)controller.abort();}}});
 return {report,builds};
}
for(const end of [120000,120001]){
 test('late preflight authorization prevents work at '+end,async()=>{const {report,builds}=await execute({lateCall:1,end});assert.equal(builds,0);assert.equal(report.status,'incomplete');assert.equal(report.results[0].status,'timeout');assert.equal(report.results[0].reason,'run_timeout');assert.equal(report.results[0].samples.length,0);assert.equal(report.results[0].statistics,null);});
 test('late final authorization rejects sample at '+end,async()=>{const {report}=await execute({lateCall:2,end});assert.equal(report.status,'incomplete');assert.equal(report.results[0].status,'timeout');assert.equal(report.results[0].reason,'run_timeout');assert.deepEqual(report.results[0].samples,[{phase:'measurement',status:'timeout'}]);assert.equal(report.results[0].statistics,null);});
}
test('authorization before deadline preserves valid result',async()=>{const {report}=await execute({lateCall:2,end:119999});assert.equal(report.status,'ok');assert.equal(report.results[0].statistics.count,1);assert.equal(report.results[0].samples[0].status,'ok');});
test('cancellation still takes precedence over expired deadline',async()=>{const {report}=await execute({lateCall:2,end:120001,abort:true});assert.equal(report.status,'cancelled');assert.equal(report.results[0].status,'cancelled');assert.equal(report.results[0].statistics,null);});
