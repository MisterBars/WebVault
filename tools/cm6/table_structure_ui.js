import {Transaction} from '@codemirror/state';
import {isolateHistory} from '@codemirror/commands';
import {tableStructureChange,dropMoveIndex} from './table_structure_model.js';
export function attachTableStructure(root,table,view,{canWrite,canStart,finishDraft,message}){
 const html=root.querySelector('table');if(!html||html.parentElement.classList.contains('wv-table-structure-frame'))return;
 const frame=document.createElement('div');frame.className='wv-table-structure-frame';html.parentNode.insertBefore(frame,html);frame.appendChild(html);
 let drag=null;
 const classes=['wv-table-drop-before-row','wv-table-drop-after-row','wv-table-drop-before-column','wv-table-drop-after-column'];
 function clear(indicatorsOnly=false){for(const node of frame.querySelectorAll(classes.map(c=>'.'+c).join(',')))node.classList.remove(...classes);if(!indicatorsOnly)for(const node of frame.querySelectorAll('[aria-grabbed=true]'))node.setAttribute('aria-grabbed','false');}
 function ready(){const expected=view.state.doc;if(!finishDraft())return false;if(view.state.doc!==expected){message('Ячейка сохранена. Повторите действие на актуальной таблице.');return false;}if(!canWrite()||!canStart()){message('Сначала завершите ввод или дождитесь окончания операции.');return false;}return true;}
 function focus(result,op,how){
  const cells=Array.from(view.dom.querySelectorAll('[data-wv-table-cell]')),cell=cells.find(n=>n.dataset.wvTableFrom===String(table.from)&&n.dataset.wvRow===String(result.focusRow)&&n.dataset.wvColumn===String(result.focusColumn));if(!cell)return;
  cell.scrollIntoView({block:'nearest',inline:'nearest'});
  if(how==='handle'){const axis=op.kind==='move-row'?'row':'column',index=axis==='row'?result.focusRow-1:result.focusColumn;const handle=Array.from(cell.querySelectorAll('[data-wv-structure-axis]')).find(n=>n.dataset.wvStructureAxis===axis&&n.dataset.wvStructureIndex===String(index));if(handle){handle.focus({preventScroll:true});return;}}
  if(op.kind.startsWith('add-'))cell.wvBeginEdit?.();else cell.focus({preventScroll:true});
 }
 function apply(op,how='cell'){
  if(!ready())return;
  try{const result=tableStructureChange(view.state.doc.toString(),table,op);if(!result)return;view.dispatch({changes:result.change,annotations:[Transaction.userEvent.of('input.table.structure'),isolateHistory.of('full')]});queueMicrotask(()=>{focus(result,op,how);view.requestMeasure();});}catch(error){message(error.message);}
 }
 function handle(cell,axis,index){
  const node=document.createElement('span');node.className=axis==='row'?'wv-table-row-handle':'wv-table-column-handle';node.textContent='⋮⋮';node.draggable=true;node.tabIndex=0;node.dataset.wvTableControls='true';node.dataset.wvStructureAxis=axis;node.dataset.wvStructureIndex=String(index);node.setAttribute('role','button');node.setAttribute('aria-grabbed','false');node.title=(axis==='row'?'Переместить строку данных ':'Переместить столбец ')+(index+1)+(axis==='row'?' (Alt+↑/↓)':' (Alt+←/→)');node.setAttribute('aria-label',node.title);cell.appendChild(node);
  node.addEventListener('mousedown',e=>e.stopPropagation());node.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
  node.addEventListener('dragstart',e=>{e.stopPropagation();if(!ready()){e.preventDefault();return;}drag={axis,from:index,doc:view.state.doc};node.setAttribute('aria-grabbed','true');if(e.dataTransfer){e.dataTransfer.setData('application/x-webvault-table-structure','move');e.dataTransfer.effectAllowed='move';}});
  node.addEventListener('dragend',()=>{clear();drag=null;});
  node.addEventListener('keydown',e=>{const keys=axis==='row'?['ArrowUp','ArrowDown']:['ArrowLeft','ArrowRight'];if(e.altKey&&keys.includes(e.key)){e.preventDefault();e.stopPropagation();const to=index+(e.key===keys[0]?-1:1),length=axis==='row'?table.rows.length-1:table.width;if(to>=0&&to<length)apply({kind:'move-'+axis,from:index,to},'handle');}else if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();message(node.title);}});
 }
 Array.from(html.rows[0].cells).forEach((cell,i)=>handle(cell,'column',i));Array.from(html.rows).slice(1).forEach((row,i)=>handle(row.cells[0],'row',i));
 function target(e){
  if(!drag||drag.doc!==view.state.doc||!canWrite()||!canStart())return null;const cell=e.target.closest?.('td,th');if(!cell||cell.closest('table')!==html)return null;
  const axis=drag.axis,index=axis==='row'?cell.parentElement.rowIndex-1:cell.cellIndex,length=axis==='row'?table.rows.length-1:table.width;if(index<0||index>=length)return null;
  const box=(axis==='row'?cell.parentElement:cell).getBoundingClientRect(),after=axis==='row'?e.clientY>box.top+box.height/2:e.clientX>box.left+box.width/2;return {axis,index,after,to:dropMoveIndex(drag.from,index,after,length)};
 }
 frame.addEventListener('dragover',e=>{const t=target(e);if(!t)return;e.preventDefault();e.stopPropagation();if(e.dataTransfer)e.dataTransfer.dropEffect='move';clear(true);const name='wv-table-drop-'+(t.after?'after':'before')+'-'+t.axis;if(t.axis==='row')html.rows[t.index+1].classList.add(name);else for(const row of html.rows)row.cells[t.index].classList.add(name);});
 frame.addEventListener('drop',e=>{const t=target(e);if(!t)return;e.preventDefault();e.stopPropagation();const op={kind:'move-'+t.axis,from:drag.from,to:t.to};clear();drag=null;apply(op);});
 function add(kind,label){const button=document.createElement('button');button.type='button';button.textContent='＋';button.title=label;button.setAttribute('aria-label',label);button.className='wv-table-'+kind;button.dataset.wvTableControls='true';button.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();});button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();apply({kind});});frame.appendChild(button);}
 add('add-row','Добавить строку');add('add-column','Добавить столбец');
 if(!document.getElementById('wv-table-structure-style')){const s=document.createElement('style');s.id='wv-table-structure-style';s.textContent='.wv-table-structure-frame{position:relative;padding:0 24px 25px 22px}.wv-table-structure-frame th,.wv-table-structure-frame td{min-width:44px}.wv-table-structure-frame td:first-child{position:relative}.wv-table-row-handle,.wv-table-column-handle{position:absolute;display:inline-flex;align-items:center;justify-content:center;width:18px;height:20px;color:var(--text-muted);background:var(--background-primary);border-radius:var(--radius-s,4px);cursor:grab;user-select:none;opacity:0;pointer-events:none;font:var(--font-ui-small,12px) var(--font-interface,sans-serif)}.wv-table-row-handle{left:-21px;top:3px}.wv-table-column-handle{left:1px;top:-21px}.wv-table-structure-frame tr:hover .wv-table-row-handle,.wv-table-structure-frame th:hover>.wv-table-column-handle,.wv-table-row-handle:focus,.wv-table-column-handle:focus{opacity:1;pointer-events:auto}.wv-table-add-row,.wv-table-add-column{position:absolute;box-sizing:border-box;width:22px;height:22px;min-height:0;margin:0;padding:0;border:1px solid var(--background-modifier-border);border-radius:var(--radius-s,4px);background:var(--background-primary);color:var(--text-muted);cursor:pointer;opacity:0;pointer-events:none}.wv-table-add-row{bottom:0;left:50%;transform:translateX(-50%)}.wv-table-add-column{right:0;top:50%;transform:translateY(-50%)}.wv-table-structure-frame:hover>.wv-table-add-row,.wv-table-structure-frame:hover>.wv-table-add-column,.wv-table-structure-frame:focus-within>.wv-table-add-row,.wv-table-structure-frame:focus-within>.wv-table-add-column{opacity:1;pointer-events:auto}.wv-table-drop-before-row>td{box-shadow:inset 0 2px 0 var(--interactive-accent)}.wv-table-drop-after-row>td{box-shadow:inset 0 -2px 0 var(--interactive-accent)}.wv-table-drop-before-column{box-shadow:inset 2px 0 0 var(--interactive-accent)}.wv-table-drop-after-column{box-shadow:inset -2px 0 0 var(--interactive-accent)}';document.head.appendChild(s);}
 window.__WV_TABLE_STRUCTURE_TEST='table-structure-18f';
}
