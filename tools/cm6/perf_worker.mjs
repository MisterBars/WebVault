import {parentPort,workerData} from 'node:worker_threads';
import {performance} from 'node:perf_hooks';
import {prepare} from './perf_scenarios.mjs';
const s=prepare(workerData.id,workerData.size);
parentPort.on('message',m=>{
 if(m?.type!=='sample'||!Number.isInteger(m.sequence))throw Error('protocol');
 try{const start=performance.now(),value=s.operation(),elapsedMs=performance.now()-start;s.check(value);parentPort.postMessage({type:'sample',sequence:m.sequence,status:'ok',elapsedMs});}
 catch{parentPort.postMessage({type:'sample',sequence:m.sequence,status:'error'});}
});
parentPort.postMessage({type:'ready',hash:s.hash});
