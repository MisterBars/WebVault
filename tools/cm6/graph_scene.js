export function mountGraphScene({viewport,nodes,edges,positions=new Map(),forces,width=960,height=560,onVisit=()=>{},onEnter=()=>{},onLeave=()=>{},onFrame=()=>{}}){
 const NS='http://www.w3.org/2000/svg',doc=viewport.ownerDocument;let alive=true,simulation=null;
 function svg(tag,parent){const n=doc.createElementNS(NS,tag);parent.appendChild(n);return n;}
 const lines=svg('g',viewport),dots=svg('g',viewport);
 for(const e of edges){e.line=svg('line',lines);e.line.setAttribute('stroke','var(--text-muted)');e.line.setAttribute('stroke-width','1');}
 for(const n of nodes){
  const g=svg('g',dots);g.dataset.id=n.id;g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-label',n.label+' — '+n.status);g.style.cursor='pointer';n.element=g;
  n.circle=svg('circle',g);n.circle.setAttribute('r','5');n.circle.setAttribute('fill',n.status==='resolved'?'var(--interactive-accent)':'var(--text-muted)');
  if(n.status!=='resolved'){n.circle.setAttribute('stroke','var(--text-error,#f88)');n.circle.setAttribute('stroke-dasharray','2 2');}
  const text=svg('text',g);text.textContent=n.label;text.setAttribute('x','9');text.setAttribute('y','4');const title=svg('title',g);title.textContent=(n.path||n.label)+' · '+n.status;
  g.addEventListener('mouseenter',()=>{if(alive)onEnter(n);});g.addEventListener('mouseleave',()=>{if(alive)onLeave(n);});g.addEventListener('keydown',e=>{if(alive&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onVisit(n);}});
 }
 function tick(){
  if(!alive)return;
  for(const e of edges){e.line.setAttribute('x1',e.source.x);e.line.setAttribute('y1',e.source.y);e.line.setAttribute('x2',e.target.x);e.line.setAttribute('y2',e.target.y);}
  for(const n of nodes){n.element.setAttribute('transform','translate('+n.x+','+n.y+')');positions.set(n.id,{x:n.x,y:n.y});}onFrame();
 }
 function dispose(){alive=false;if(simulation)simulation.stop();}
 try{
  simulation=forces.forceSimulation(nodes);
  simulation.force('link',forces.forceLink(edges).id(n=>n.id).distance(85)).force('charge',forces.forceManyBody().strength(-120)).force('center',forces.forceCenter(width/2,height/2)).force('collide',forces.forceCollide(22)).on('tick',tick);
  return {simulation,dispose};
 }catch(e){dispose();throw e;}
}
