export function createGraphInteraction({svg,viewport,getNodes,getEdges,getSimulation,isActive,onVisit=()=>{},activeId=()=>null}){
 if(!svg||!viewport||typeof svg.addEventListener!=='function'||typeof svg.removeEventListener!=='function'||typeof viewport.setAttribute!=='function'||[getNodes,getEdges,getSimulation,isActive,onVisit,activeId].some(fn=>typeof fn!=='function'))throw Error('invalid_graph_interaction');
 let alive=true,gesture=null,pan={x:0,y:0,k:1};const listeners=[],counters={zoomEvents:0,panGestures:0,nodeDrags:0,hoverEvents:0,activationEvents:0,cancelledGestures:0};
 const live=()=>alive&&isActive(),nodes=()=>getNodes()||[],edges=()=>getEdges()||[];
 function apply(){if(alive)viewport.setAttribute('transform','translate('+pan.x+','+pan.y+') scale('+pan.k+')');}
 function point(e){if(!Number.isFinite(e.clientX)||!Number.isFinite(e.clientY))return null;try{const matrix=svg.getScreenCTM();if(!matrix)return null;const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const result=p.matrixTransform(matrix.inverse());return Number.isFinite(result.x)&&Number.isFinite(result.y)?result:null;}catch(ignore){return null;}}
 function releaseCapture(id){try{if(svg.hasPointerCapture?.(id))svg.releasePointerCapture(id);}catch(ignore){}}
 function activate(node){if(!live()||!nodes().includes(node))return;counters.activationEvents++;return onVisit(node);}
 function finish(cancelled){if(!gesture)return;const g=gesture;gesture=null;releaseCapture(g.id);if(g.node){g.node.fx=null;g.node.fy=null;if(g.simulation)g.simulation.alphaTarget(0);}if(cancelled){counters.cancelledGestures++;return;}if(g.node){if(g.changed)counters.nodeDrags++;if(!g.moved)activate(g.node);}else if(g.changed)counters.panGestures++;}
 function cancel(){finish(true);}
 function wheel(e){if(!live()||!Number.isFinite(e.deltaY))return;const p=point(e);if(!p)return;e.preventDefault();const k=Math.max(.2,Math.min(4,pan.k*Math.exp(-e.deltaY*.001))),x=p.x-(p.x-pan.x)*k/pan.k,y=p.y-(p.y-pan.y)*k/pan.k;if(!Number.isFinite(x)||!Number.isFinite(y))return;if(k!==pan.k)counters.zoomEvents++;pan={x,y,k};apply();}
 function down(e){if(!live()||gesture||e.button!==0||!Number.isInteger(e.pointerId))return;const p=point(e);if(!p)return;let target=e.target;if(target?.nodeType===3)target=target.parentElement;const group=target?.closest?.('g[data-id]'),node=group&&nodes().find(n=>n.id===group.dataset.id&&(!n.element||n.element===group));gesture={id:e.pointerId,start:p,pan:{...pan},node,simulation:getSimulation(),moved:false,changed:false};try{svg.setPointerCapture?.(e.pointerId);}catch(ignore){}}
 function move(e){if(!gesture||gesture.id!==e.pointerId)return;if(!live()||gesture.node&&!nodes().includes(gesture.node)){cancel();return;}const p=point(e);if(!p){cancel();return;}const g=gesture;if(Math.hypot(p.x-g.start.x,p.y-g.start.y)>4)g.moved=true;if(g.node&&g.moved){const x=(p.x-pan.x)/pan.k,y=(p.y-pan.y)/pan.k;if(!Number.isFinite(x)||!Number.isFinite(y))return;g.node.fx=x;g.node.fy=y;g.changed=true;if(g.simulation)g.simulation.alphaTarget(.15).restart();}else if(!g.node){const x=g.pan.x+p.x-g.start.x,y=g.pan.y+p.y-g.start.y;if(!Number.isFinite(x)||!Number.isFinite(y))return;if(x!==pan.x||y!==pan.y)g.changed=true;pan={...pan,x,y};apply();}}
 function up(e){if(gesture&&gesture.id===e.pointerId)finish(!live());}
 function interrupted(e){if(gesture&&gesture.id===e.pointerId)cancel();}
 const edgeId=end=>typeof end==='object'&&end!==null?end.id:end;
 function highlight(id){if(!live())return;const adjacent=new Set([id]);for(const edge of edges())if(edgeId(edge.source)===id||edgeId(edge.target)===id){adjacent.add(edgeId(edge.source));adjacent.add(edgeId(edge.target));}for(const node of nodes()){node.circle?.setAttribute('r',node.id===id?'8':'5');if(node.element)node.element.style.opacity=!id||adjacent.has(node.id)?'1':'.35';}for(const edge of edges())if(edge.line)edge.line.style.opacity=!id||edgeId(edge.source)===id||edgeId(edge.target)===id?'.75':'.12';}
 function enter(node){if(!live()||!nodes().includes(node))return;counters.hoverEvents++;highlight(node.id);}
 function leave(){highlight(activeId());}
 function reset(){if(!alive)return;cancel();pan={x:0,y:0,k:1};apply();}
 function resetCounters(){if(alive)for(const key of Object.keys(counters))counters[key]=0;}
 function on(target,type,fn,options){if(!target?.addEventListener||!target.removeEventListener)return;target.addEventListener(type,fn,options);listeners.push([target,type,fn,options]);}
 function detach(){for(const [target,type,fn,options] of listeners)target.removeEventListener(type,fn,options);listeners.length=0;}
 try{on(svg,'wheel',wheel,{passive:false});on(svg,'pointerdown',down);on(svg,'pointermove',move);on(svg,'pointerup',up);on(svg,'pointercancel',interrupted);on(svg,'lostpointercapture',interrupted);on(svg.ownerDocument?.defaultView,'blur',cancel);apply();}catch(e){alive=false;detach();throw e;}
 return {apply,cancel,reset,resetCounters,highlight,enter,leave,activate,snapshot:()=>({...counters,pan:{...pan}}),dispose(){if(!alive)return;try{cancel();}finally{alive=false;detach();}}};
}
