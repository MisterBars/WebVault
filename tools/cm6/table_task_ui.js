import {makeTaskCheckbox,makeTaskTime} from './task_ui.js';
import {hasTableDraft} from './table_ui.js';
import {toggleTableTaskChanges} from './table_task_model.js';
export function makeTableTaskCheckbox(task){
 const node=makeTaskCheckbox(task,null,()=>typeof window!=='undefined'&&window.WebVaultCM6?.view.state.doc.toString()===task.sourceText,toggleTableTaskChanges);node.dataset.wvTableTask='true';if(Number.isInteger(task.row)&&Number.isInteger(task.column))node.setAttribute('aria-label','Строка '+(task.row+1)+', столбец '+(task.column+1)+': '+(task.checked?'Снять отметку':'Отметить'));return node;
}
export function makeTableTaskTime(iso){const node=makeTaskTime(iso);node.classList.add('wv-table-task-time');return node;}
export function installTableTaskStyle(){
 if(document.getElementById('wv-table-task-style'))return;
 const s=document.createElement('style');s.id='wv-table-task-style';s.textContent='.wv-render .wv-table-task-time{float:none;display:block;margin:3px 0 0;white-space:nowrap}';document.head.appendChild(s);
 let blockClick=false;
 window.addEventListener('pointerdown',e=>{
  if(!hasTableDraft()||!e.target.closest?.('[data-wv-table-task]'))return;
  e.preventDefault();e.stopImmediatePropagation();blockClick=true;window.WebVaultCore.message('Сначала подтвердите ячейку через Enter/Ctrl+S или отмените ввод через Escape.');
 },true);
 window.addEventListener('click',e=>{if(blockClick){blockClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
 window.__WV_TABLE_TASKS_TEST='table-tasks-18d';
}
