export function footnoteDefinitionGroups(text,definitions){
 const groups=[];
 for(const d of [...definitions].filter(d=>Number.isSafeInteger(d.from)&&Number.isSafeInteger(d.to)&&d.from>=0&&d.to>d.from&&d.to<=text.length).sort((a,b)=>a.from-b.from)){
  const last=groups.at(-1);
  if(last&&d.from>=last.to&&/^[ \t\r\n]*$/.test(text.slice(last.to,d.from))){last.to=d.to;last.definitions.push(d);}
  else groups.push({from:d.from,to:d.to,definitions:[d]});
 }
 return groups;
}
export function definitionGroupActive(ranges,group){return ranges.some(r=>r.empty?r.head>=group.from&&r.head<=group.to:r.from<group.to&&r.to>group.from);}
export function crossedDefinitionGroup(groups,head,next,forward){return (forward?groups:[...groups].reverse()).find(g=>forward?head<g.from&&next>=g.from:head>g.to&&next<=g.to)||null;}
