import {Transaction} from '@codemirror/state';
import {isolateHistory} from '@codemirror/commands';
import {tableRemovalChange} from './table_delete_model.js';
export function attachTableDelete(root,table,view,{canWrite,canStart,finishDraft,message}){
 const bar=document.createElement('div');bar.className='wv-table-delete-bar';bar.dataset.wvTableControls='true';
 const button=document.createElement('button');button.type='button';button.textContent='Удалить таблицу';button.setAttribute('aria-haspopup','dialog');bar.appendChild(button);root.appendChild(bar);
 bar.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();});bar.addEventListener('click',e=>e.stopPropagation());
 button.addEventListener('click',()=>{
  const expected=view.state.doc;if(!finishDraft())return;if(view.state.doc!==expected){message('Ячейка сохранена. Нажмите удалить на актуальной таблице ещё раз.');return;}
  if(!canWrite()||!canStart()){message('Сначала завершите ввод или дождитесь окончания операции.');return;}
  const dialog=document.createElement('dialog');dialog.className='wv-table-delete-dialog';dialog.dataset.wvTableControls='true';dialog.setAttribute('aria-label','Удаление таблицы');
  const title=document.createElement('h3');title.textContent='Удалить таблицу целиком?';
  const text=document.createElement('p');text.textContent=table.width+' столбцов, '+(table.rows.length-1)+' строк данных. Содержимое, ссылки и отметки будут удалены вместе с таблицей. Операцию можно отменить через Undo.';
  const status=document.createElement('p');status.setAttribute('role','status');
  const actions=document.createElement('div');actions.className='wv-table-delete-actions';
  const apply=document.createElement('button');apply.type='button';apply.textContent='Удалить таблицу';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Отмена';actions.append(apply,cancel);dialog.append(title,text,status,actions);document.body.appendChild(dialog);
  function close(focus=true){if(dialog.open)dialog.close();dialog.remove();if(focus&&button.isConnected)button.focus({preventScroll:true});}
  cancel.addEventListener('click',()=>close());dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  apply.addEventListener('click',()=>{
   if(!canWrite()||!canStart()||view.state.doc!==expected){status.textContent='Заметка изменилась или редактор занят. Отмените диалог и повторите действие.';return;}
   try{const change=tableRemovalChange(view.state.doc.toString(),table),length=view.state.doc.length-(change.to-change.from);view.dispatch({changes:change,selection:{anchor:Math.min(change.from,length)},annotations:[Transaction.userEvent.of('input.table.delete'),isolateHistory.of('full')]});close(false);queueMicrotask(()=>view.focus());}catch(error){status.textContent=error.message;}
  });
  if(typeof dialog.showModal!=='function'){close();message('Диалог удаления недоступен. Используйте source.');return;}
  try{dialog.showModal();cancel.focus({preventScroll:true});}catch(error){close();message(error.message);}
 });
 if(!document.getElementById('wv-table-delete-style')){const s=document.createElement('style');s.id='wv-table-delete-style';s.textContent='.wv-table-delete-bar{display:flex;justify-content:flex-end;margin-top:4px;opacity:0;pointer-events:none}.wv-render:hover>.wv-table-delete-bar,.wv-table-delete-bar:focus-within{opacity:1;pointer-events:auto}.wv-table-delete-bar button{margin:0;padding:3px 7px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-s,4px);background:var(--background-primary);color:var(--text-muted);font:var(--font-ui-small,13px) var(--font-interface,sans-serif);cursor:pointer}.wv-table-delete-bar button:hover{color:var(--text-error,var(--text-normal))}.wv-table-delete-dialog{max-width:min(480px,calc(100vw - 32px));padding:16px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-m,6px);background:var(--background-primary);color:var(--text-normal);font:var(--font-ui-small,14px) var(--font-interface,sans-serif)}.wv-table-delete-dialog::backdrop{background:rgba(0,0,0,.45)}.wv-table-delete-actions{display:flex;justify-content:flex-end;gap:8px}';document.head.appendChild(s);}
 if(typeof window!=='undefined')window.__WV_TABLE_DELETE_TEST='table-delete-18e';
}
