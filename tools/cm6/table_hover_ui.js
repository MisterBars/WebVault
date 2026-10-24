export function wrapTableHandle(cell,node,axis){
 const zone=document.createElement('span');zone.className=axis==='row'?'wv-table-row-hitbox':'wv-table-column-hitbox';zone.dataset.wvTableControls='true';cell.appendChild(zone);zone.appendChild(node);
 node.setAttribute('aria-keyshortcuts',axis==='row'?'Alt+ArrowUp Alt+ArrowDown':'Alt+ArrowLeft Alt+ArrowRight');
 node.addEventListener('click',()=>{if(node.isConnected)node.focus({preventScroll:true});});
 zone.addEventListener('mousedown',e=>{if(e.target===zone)e.preventDefault();e.stopPropagation();});
 zone.addEventListener('click',e=>{if(e.target===zone)e.preventDefault();e.stopPropagation();});
 if(!document.getElementById('wv-table-hover-style')){
  const s=document.createElement('style');s.id='wv-table-hover-style';s.textContent='.wv-table-row-hitbox,.wv-table-column-hitbox{position:absolute;background:transparent;pointer-events:auto;z-index:1}.wv-table-row-hitbox{left:-22px;top:0;bottom:0;width:22px}.wv-table-column-hitbox{left:0;right:0;top:-22px;height:22px}.wv-table-row-hitbox>.wv-table-row-handle{left:1px;top:3px}.wv-table-column-hitbox>.wv-table-column-handle{left:1px;top:1px}.wv-table-structure-frame tr:hover .wv-table-row-handle,.wv-table-structure-frame th:hover .wv-table-column-handle,.wv-table-row-hitbox:hover>.wv-table-row-handle,.wv-table-column-hitbox:hover>.wv-table-column-handle{opacity:1;pointer-events:auto}.wv-table-column-tools{z-index:3}.wv-table-row-handle:focus-visible,.wv-table-column-handle:focus-visible{outline:2px solid var(--interactive-accent);outline-offset:1px}';document.head.appendChild(s);
 }
 if(typeof window!=='undefined')window.__WV_TABLE_HOVER_TEST='table-hover-18g';return zone;
}
