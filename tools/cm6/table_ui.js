import {Transaction} from '@codemirror/state';
import {isolateHistory} from '@codemirror/commands';
import {parseTable,tableCellChange} from './table_model.js';
let draft=null;
export function hasTableDraft(){return !!draft;}
export function finishTableDraft(){return !draft||draft.commit();}
export function focusTableCell(view,from,row=0,column=0){const cell=Array.from(view.dom.querySelectorAll('[data-wv-table-cell]')).find(n=>n.dataset.wvTableFrom===String(from)&&n.dataset.wvRow===String(row)&&n.dataset.wvColumn===String(column));if(cell?.wvBeginEdit)cell.wvBeginEdit();}
export function createEditableTable(block,view,{renderTokens,onNote,canWrite,canStart,onSave,message}){
 const root=renderTokens(block.tokens,onNote);let table;
 try{table=parseTable(view.state.doc.toString(),block.from,block.to);}catch(error){root.title=error.message;return root;}
 const rows=Array.from(root.querySelector('table').rows);if(rows.length!==table.rows.length||rows.some(r=>r.cells.length!==table.width)){root.title='Не удалось сопоставить ячейки с исходником.';return root;}
 const status=document.createElement('div');status.className='wv-table-status';status.setAttribute('role','status');root.appendChild(status);
 rows.forEach((tr,r)=>Array.from(tr.cells).forEach((cell,c)=>{
  cell.dataset.wvTableCell='true';cell.dataset.wvTableFrom=String(table.from);cell.dataset.wvRow=String(r);cell.dataset.wvColumn=String(c);cell.tabIndex=0;
  cell.wvBeginEdit=()=>{
   if(draft?.cell===cell){draft.input.focus();return;}
   if(!finishTableDraft()||!canWrite()||!canStart()||!cell.isConnected)return;
   const original=Array.from(cell.childNodes),input=document.createElement('textarea');input.className='wv-table-cell-input';input.rows=1;input.value=table.rows[r][c].value;input.defaultValue=input.value;input.setAttribute('aria-label','Строка '+(r+1)+', столбец '+(c+1));cell.replaceChildren(input);cell.classList.add('wv-table-cell-editing');
   const current={cell,input,view,commit,cancel};draft=current;
   function cancel(){if(draft!==current)return;draft=null;cell.replaceChildren(...original);cell.classList.remove('wv-table-cell-editing');status.textContent='';}
   function commit(){
    if(draft!==current)return true;
    try{if(!canWrite())throw new Error('Заметка изменилась или редактор занят. Завершите ввод после окончания операции.');const change=tableCellChange(view.state.doc.toString(),table,r,c,input.value);if(change)view.dispatch({changes:change,annotations:[Transaction.userEvent.of('input.table'),isolateHistory.of('full')]});cancel();return true;}catch(error){status.textContent=error.message;message(error.message);input.focus();return false;}
   }
   input.wvCommit=commit;
   function move(row,col){if(!commit())return;queueMicrotask(()=>{if(row>=0&&row<table.rows.length&&col>=0&&col<table.width)focusTableCell(view,table.from,row,col);else view.focus();});}
   input.addEventListener('keydown',e=>{
    if(e.isComposing||e.keyCode===229)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();cell.focus();}
    else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();e.stopPropagation();if(commit())onSave();}
    else if(e.key==='Tab'){e.preventDefault();e.stopPropagation();const next=r*table.width+c+(e.shiftKey?-1:1);move(next<0?-1:Math.floor(next/table.width),next<0?0:next%table.width);}
    else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();move(r+1,c);}
    else if(e.key==='Enter'){e.preventDefault();status.textContent='Физические переносы внутри ячейки пока не поддержаны.';}
   });
   input.addEventListener('paste',e=>{if(/[\r\n]/.test(e.clipboardData?.getData('text')||'')){e.preventDefault();status.textContent='Вставляйте содержимое одной ячейки без переводов строк.';}});
   input.addEventListener('input',()=>{input.style.height='auto';input.style.height=input.scrollHeight+'px';});
   input.addEventListener('blur',()=>queueMicrotask(()=>{if(draft===current&&!cell.contains(document.activeElement))commit();}));
   input.focus({preventScroll:true});input.style.height=input.scrollHeight+'px';
  };
  cell.addEventListener('mousedown',e=>{if(e.target.closest('input,textarea,a')&&!e.altKey)return;e.preventDefault();e.stopPropagation();cell.wvBeginEdit();});
  cell.addEventListener('click',e=>{if(e.target.closest('a')&&!e.altKey)return;e.preventDefault();e.stopPropagation();if(!e.target.closest('textarea'))cell.wvBeginEdit();});
  cell.addEventListener('keydown',e=>{if(e.target===cell&&(e.key==='Enter'||e.key==='F2')){e.preventDefault();e.stopPropagation();cell.wvBeginEdit();}});
 }));return root;
}
export function installTableStyle(){
 if(document.getElementById('wv-table-style'))return;const s=document.createElement('style');s.id='wv-table-style';s.textContent='.wv-table-cell-editing{padding:0!important}.wv-table-cell-input{display:block;box-sizing:border-box;width:100%;min-width:60px;min-height:32px;margin:0;padding:5px 8px;resize:none;border:1px solid var(--interactive-accent);border-radius:0;background:var(--background-primary);color:var(--text-normal);font:inherit;line-height:inherit;overflow:hidden}.wv-table-status{color:var(--text-error);font:var(--font-ui-small,13px) var(--font-interface,sans-serif)}.wv-table-status:empty{display:none}';document.head.appendChild(s);
 let blockClick=false;
 window.addEventListener('pointerdown',e=>{
  if(!draft||draft.input.contains(e.target))return;const cell=e.target.closest?.('[data-wv-table-cell]'),view=draft.view,from=cell?.dataset.wvTableFrom,row=cell?.dataset.wvRow,column=cell?.dataset.wvColumn;
  if(!finishTableDraft()){e.preventDefault();e.stopImmediatePropagation();blockClick=true;return;}
  if(cell&&!cell.isConnected){e.preventDefault();e.stopImmediatePropagation();blockClick=true;queueMicrotask(()=>focusTableCell(view,Number(from),Number(row),Number(column)));}
 },true);
 window.addEventListener('click',e=>{if(blockClick){blockClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
 window.addEventListener('beforeunload',e=>{if(draft&&draft.input.value!==draft.input.defaultValue){e.preventDefault();e.returnValue='';}});
 window.__WV_TABLE_TEST='table-cells-18a';
}
