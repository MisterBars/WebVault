import {attachTableStructure} from './table_structure_ui.js';
import {attachTableDelete} from './table_delete_ui.js';
import {Transaction} from '@codemirror/state';
import {isolateHistory} from '@codemirror/commands';
import {TABLE_ALIGNMENTS,tableAlignment,tableAlignmentChange} from './table_alignment_model.js';
export function attachTableAlignment(root,table,view,{canWrite,canStart,finishDraft,message}){
 attachTableDelete(root,table,view,{canWrite,canStart,finishDraft,message});
 root.classList.add('wv-table-with-alignment');
 const headers=Array.from(root.querySelector('table').rows[0].cells);
 function control(column){return Array.from(view.dom.querySelectorAll('[data-wv-table-align-from]')).find(n=>n.dataset.wvTableAlignFrom===String(table.from)&&n.dataset.wvTableAlignColumn===String(column));}
 headers.forEach((header,column)=>{
  const tools=document.createElement('span');tools.className='wv-table-column-tools';tools.dataset.wvTableControls='true';
  const button=document.createElement('button');button.type='button';button.textContent='⋯';button.dataset.wvTableAlignFrom=String(table.from);button.dataset.wvTableAlignColumn=String(column);button.title='Выравнивание столбца '+(column+1);button.setAttribute('aria-label',button.title);button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');tools.appendChild(button);header.appendChild(tools);
  let menu=null;
  function close(focus=false){if(menu)menu.remove();menu=null;button.setAttribute('aria-expanded','false');if(focus&&button.isConnected)button.focus({preventScroll:true});}
  tools.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();});tools.addEventListener('click',e=>e.stopPropagation());
  button.addEventListener('click',()=>{
   if(menu){close(true);return;}
   const before=view.state.doc;if(!finishDraft())return;if(view.state.doc!==before){queueMicrotask(()=>control(column)?.click());return;}
   if(!canWrite()||!canStart()){message('Сначала завершите ввод или дождитесь окончания операции.');return;}
   menu=document.createElement('div');menu.className='wv-table-align-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label',button.title);button.setAttribute('aria-expanded','true');
   const selected=tableAlignment(table.alignment[column]);
   for(const [key,label] of TABLE_ALIGNMENTS){
    const item=document.createElement('button');item.type='button';item.textContent=label;item.setAttribute('role','menuitemradio');item.setAttribute('aria-checked',String(key===selected));menu.appendChild(item);
    item.addEventListener('click',()=>{
     if(!canWrite()||!canStart())return;
     try{const change=tableAlignmentChange(view.state.doc.toString(),table,column,key);if(change)view.dispatch({changes:change,annotations:[Transaction.userEvent.of('input.table.align'),isolateHistory.of('full')]});close();queueMicrotask(()=>control(column)?.focus({preventScroll:true}));}catch(error){message(error.message);}
    });
   }
   tools.appendChild(menu);menu.querySelector('[aria-checked=true]').focus({preventScroll:true});
  });
  tools.addEventListener('keydown',e=>{
   if(!menu)return;const items=Array.from(menu.querySelectorAll('button')),index=items.indexOf(document.activeElement);
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}
   else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();const next=e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items[next].focus();}
  });
  tools.addEventListener('focusout',()=>queueMicrotask(()=>{if(!tools.contains(document.activeElement))close();}));
 });
 if(!document.getElementById('wv-table-align-style')){const s=document.createElement('style');s.id='wv-table-align-style';s.textContent='.wv-table-with-alignment{padding-top:22px!important}.wv-table-with-alignment th{position:relative}.wv-table-column-tools{position:absolute;right:2px;top:-21px;opacity:0;pointer-events:none;font:var(--font-ui-small,13px) var(--font-interface,sans-serif)}th:hover>.wv-table-column-tools,.wv-table-column-tools:focus-within{opacity:1;pointer-events:auto}.wv-table-column-tools>button{margin:0;padding:0 6px;min-height:18px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-s,4px);background:var(--background-primary);color:var(--text-muted);cursor:pointer}.wv-table-align-menu{position:absolute;top:100%;right:0;z-index:40;min-width:160px;padding:4px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-m,6px);background:var(--background-primary);color:var(--text-normal)}.wv-table-align-menu button{display:block;width:100%;margin:0;padding:5px 8px;border:0;background:transparent;color:inherit;text-align:left;font:inherit;cursor:pointer}.wv-table-align-menu button:hover,.wv-table-align-menu button:focus,.wv-table-align-menu [aria-checked=true]{background:var(--background-modifier-hover)}';document.head.appendChild(s);}
 attachTableStructure(root,table,view,{canWrite,canStart,finishDraft,message});
}
