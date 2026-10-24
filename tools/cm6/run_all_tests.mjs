import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
export function discoverTests(cwd){return readdirSync(cwd,{withFileTypes:true}).filter(entry=>entry.isFile()&&entry.name.endsWith('.test.mjs')).map(entry=>entry.name).sort();}
export function runAllTests({cwd=fileURLToPath(new URL('.',import.meta.url)),spawn=spawnSync,log=console.log,error=console.error}={}){
 cwd=resolve(cwd);let tests;
 try{tests=discoverTests(cwd);}catch(e){error('Cannot discover tests: '+e.message);return 1;}
 if(!tests.length){error('No .test.mjs files found in '+cwd);return 1;}
 log('Running '+tests.length+' test files from '+cwd);
 let result;try{result=spawn(process.execPath,['--test','--test-concurrency=1',...tests.map(name=>join(cwd,name))],{cwd,stdio:'inherit',shell:false});}catch(e){error('Cannot start tests: '+e.message);return 1;}
 if(result.error){error('Cannot start tests: '+result.error.message);return 1;}
 if(result.signal){error('Tests interrupted: '+result.signal);return 1;}
 return Number.isInteger(result.status)?result.status:1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=runAllTests();
