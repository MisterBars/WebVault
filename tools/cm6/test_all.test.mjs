import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {discoverTests,runAllTests} from './run_all_tests.mjs';
function fixture(t){const cwd=mkdtempSync(join(tmpdir(),'webvault tests '));t.after(()=>rmSync(cwd,{recursive:true,force:true}));return cwd;}
const quiet=cwd=>({cwd,log:()=>{},error:()=>{}});
const pass="import test from 'node:test';test('fixture pass',()=>{});\n";
test('discovers immediate test files in stable order and rejects an empty suite',t=>{
 const cwd=fixture(t);assert.equal(runAllTests(quiet(cwd)),1);
 writeFileSync(join(cwd,'b.test.mjs'),pass);writeFileSync(join(cwd,'a.test.mjs'),pass);writeFileSync(join(cwd,'other.mjs'),'');mkdirSync(join(cwd,'dir.test.mjs'));
 assert.deepEqual(discoverTests(cwd),['a.test.mjs','b.test.mjs']);
});
test('uses current Node, absolute paths, sequential workers and no shell',t=>{
 const cwd=fixture(t);writeFileSync(join(cwd,'a.test.mjs'),pass);
 assert.equal(runAllTests({...quiet(cwd),spawn:(exe,args,options)=>{assert.equal(exe,process.execPath);assert.deepEqual(args,['--test','--test-concurrency=1',join(cwd,'a.test.mjs')]);assert.equal(options.cwd,cwd);assert.equal(options.shell,false);assert.equal(options.stdio,'inherit');return {status:0};}}),0);
});
test('preserves child failures and rejects startup errors, signals or missing exit code',t=>{
 const cwd=fixture(t);writeFileSync(join(cwd,'a.test.mjs'),pass);
 for(const result of [{status:7},{error:new Error('spawn')},{signal:'SIGTERM'},{status:null}])assert.equal(runAllTests({...quiet(cwd),spawn:()=>result}),result.status===7?7:1);
 assert.equal(runAllTests({...quiet(cwd),spawn:()=>{throw Error('spawn');}}),1);
});
test('real fixture suite passes and real assertion failure propagates',t=>{
 const cwd=fixture(t);writeFileSync(join(cwd,'a.test.mjs'),pass);writeFileSync(join(cwd,'b.test.mjs'),pass);
 const capture=(exe,args,options)=>spawnSync(exe,args,{...options,stdio:'pipe',encoding:'utf8'});
 assert.equal(runAllTests({...quiet(cwd),spawn:capture}),0);
 writeFileSync(join(cwd,'b.test.mjs'),"import test from 'node:test';test('fixture fails',()=>{throw Error('expected');});\n");
 assert.equal(runAllTests({...quiet(cwd),spawn:capture}),1);
});
