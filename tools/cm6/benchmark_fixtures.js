export const FIXTURE_VERSION=1;
export function datasetConfig(input={}){
 const defaults={notes:100,linksPerNote:3,noteKiB:4,seed:1};
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(defaults,k)))throw Error('invalid_dataset');
 const c={...defaults,...input};
 for(const [k,min,max] of [['notes',2,300],['linksPerNote',0,6],['noteKiB',1,64],['seed',0,2147483647]])if(!Number.isInteger(c[k])||c[k]<min||c[k]>max)throw Error('invalid_dataset');
 if(c.linksPerNote>=c.notes||c.notes*c.linksPerNote>2000||c.notes*c.noteKiB*1024>20971520)throw Error('invalid_dataset_combination');return c;
}
export function makeFixtures(input={}){
 const config=datasetConfig(input),paths=Array.from({length:config.notes},(_,i)=>'Bench/N'+String(i).padStart(4,'0')+'.md');
 let state=config.seed>>>0;
 for(let i=paths.length-1;i>0;i--){state=(1664525*state+1013904223)>>>0;const j=state%(i+1);[paths[i],paths[j]]=[paths[j],paths[i]];}
 const notes=paths.map((path,i)=>{
  const refs=Array.from({length:config.linksPerNote},(_,j)=>({target:'/'+paths[(i+j+1)%paths.length],kind:'wiki'}));
  const head='---\nfixture: webvault-benchmark-v1\n---\n\n# Synthetic note\n\n'+refs.map(r=>'[['+r.target+'|Link]]').join('\n')+'\n\n`[[Ignored]]`\n\n%% [[Hidden]] %%\n\n';
  const length=config.noteKiB*1024;if(head.length>length)throw Error('fixture_too_small');
  return {path,version:'fixture-v1',refs,text:head+'x'.repeat(length-head.length)};
 });
 return {version:FIXTURE_VERSION,config,key:'webvault-fixture-v1:'+JSON.stringify(config),notes,bytes:notes.reduce((n,x)=>n+x.text.length,0),expectedEdges:config.notes*config.linksPerNote};
}
export function verifyGraph(graph,fixture){
 if(!graph||graph.nodes.length!==fixture.notes.length||graph.edges.length!==fixture.expectedEdges)throw Error('incorrect_graph_size');
 const ids=new Set(graph.nodes.map(n=>n.id));if(ids.size!==fixture.notes.length||fixture.notes.some(n=>!ids.has(n.path))||graph.nodes.some(n=>n.status!=='resolved'||n.path!==n.id||n.label!==n.id.split('/').pop().replace(/\.md$/i,'')||n.version!=='fixture-v1'))throw Error('incorrect_graph_nodes');
 const expected=new Set(fixture.notes.flatMap(n=>n.refs.map(r=>JSON.stringify([n.path,r.target.slice(1)])))),seen=new Set();
 for(const e of graph.edges){const key=JSON.stringify([e.source,e.target]);if(!expected.has(key)||seen.has(key)||e.count!==1)throw Error('incorrect_graph_edges');seen.add(key);}return true;
}
