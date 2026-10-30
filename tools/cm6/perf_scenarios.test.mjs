import test from 'node:test';
import assert from 'node:assert/strict';
import {prepare} from './perf_scenarios.mjs';
import {IDS,run} from './perf_runner.mjs';
test('real modules: exact deterministic fixtures at minimum/default/maximum size',()=>{for(const id of IDS)for(const size of [2,50,300]){const s=prepare(id,size);assert.match(s.hash,/^[a-f0-9]{64}$/);assert.equal(s.hash,prepare(id,size).hash);s.check(s.operation());assert.throws(()=>s.check(null));}});
test('real modules: unknown scenario is not supported',()=>assert.throws(()=>prepare('unknown',2)));
test('real modules: end-to-end worker smoke',async()=>{const r=await run({defaults:{size:2,warmup:0,repetitions:1}});assert.equal(r.status,'ok');for(const s of r.scenarios){assert.equal(s.status,'ok');assert.equal(s.statistics.count,1);assert.equal(s.samples.length,1);}});
