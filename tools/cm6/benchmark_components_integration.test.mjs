import test from 'node:test';
import assert from 'node:assert/strict';
import {makeFixtures,verifyGraph} from './benchmark_fixtures.js';
import {createWorkloadRunner} from './benchmark_workloads.js';
test('application parser and graph model process the actual synthetic corpus',async()=>{
 const {extractReferences,makeGraph}=await import('./note_index.js');
 for(const notes of [2,100,300]){const f=makeFixtures({notes,linksPerNote:1,noteKiB:1});for(const n of f.notes)assert.deepEqual(extractReferences(n.text),n.refs);assert.equal(verifyGraph(makeGraph(f.notes),f),true);}
 const runner=createWorkloadRunner({extractReferences,makeGraph,forces:{},pause:async()=>{},makeBatchId:()=> 'a'.repeat(32)});
 const r=await runner.execute({selected:['markdown.references.batch','graph.model.build'],repetitions:1,warmup:0,dataset:{notes:2,linksPerNote:1,noteKiB:1}},{signal:new AbortController().signal,authorize:async()=>{}});
 assert.equal(r.status,'ok');assert.ok(r.results.every(x=>x.statistics.count===1));
});
