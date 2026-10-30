import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {extractReferences,makeGraph,backlinks} from './note_index.js';
export function prepare(id,size){
 const notes=Array.from({length:size},(_,i)=>({path:`N${i}.md`,version:'synthetic-v1',refs:[{target:`N${(i+1)%size}`,kind:'wiki'},{target:`N${(i+1)%size}`,kind:'wiki'}]}));
 const block='[[A|Alias]] [B](B.md) `[[No]]`\n\n```md\n[[No2]]\n```\n\n%% [[Hidden]] %% <!-- [[Hidden2]] -->\n\n';
 const text='---\nrelated: "[[NotBody]]"\n---\n\n'+block.repeat(size),hash=createHash('sha256').update(JSON.stringify({version:1,notes,text})).digest('hex');
 const graph={nodes:notes.map(n=>({id:n.path,path:n.path,label:n.path.slice(0,-3),status:'resolved',version:n.version})),edges:notes.map((n,i)=>({source:n.path,target:`N${(i+1)%size}.md`,count:2}))};
 if(id==='index.references.extract')return {hash,operation:()=>extractReferences(text),check:r=>assert.deepEqual(r,Array.from({length:size},()=>[{target:'A',kind:'wiki'},{target:'B.md',kind:'markdown'}]).flat())};
 if(id==='index.graph.build')return {hash,operation:()=>makeGraph(notes),check:r=>assert.deepEqual(r,graph)};
 if(id==='index.backlinks.lookup'){const g=makeGraph(notes);assert.deepEqual(g,graph);return {hash,operation:()=>backlinks(g,'N0.md'),check:r=>assert.deepEqual(r,[{path:`N${size-1}.md`,count:2}])};}
 throw Error('Unknown scenario');
}
