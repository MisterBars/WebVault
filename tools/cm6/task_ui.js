import {Transaction} from '@codemirror/state';
import {isolateHistory} from '@codemirror/commands';
import {toggleTaskChanges,localTaskTime} from './task_model.js';
export function makeTaskCheckbox(task,view=null,guard=()=>true,changesForTask=toggleTaskChanges){
 const node=document.createElement('input');node.type='checkbox';node.className='wv-task-checkbox';node.checked=task.checked;node.setAttribute('aria-label',task.checked?'Снять отметку задачи':'Отметить задачу');
 const host=typeof window==='undefined'?null:window,core=host?.WebVaultCore??null,cm=host?.WebVaultCM6??null;view=view||cm?.view;
 const expected=view?.state?.doc,user=core?.state?.user?.id,path=core?.state?.note;
 function ready(){const history=host?.WebVaultHistory?.status?.();return !!(node.isConnected&&!node.closest('[hidden]')&&expected&&user!=null&&path&&view===host?.WebVaultCM6?.view&&view?.state?.doc===expected&&core?.state?.user?.id===user&&core?.state?.note===path&&history?.writable&&!history.blockedByDraft&&!view.state.readOnly&&[1,2].includes(host?.WebVaultCM6?.modes?.mode)&&guard());}
 node.disabled=!!(task.invalid||!expected||user==null||!path);
 node.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();});
 node.addEventListener('click',e=>{
  e.preventDefault();e.stopPropagation();if(!ready()){node.checked=task.checked;return;}
  try{const changes=changesForTask(view.state.doc.toString(),task);view.dispatch({changes,annotations:[Transaction.userEvent.of('input.task'),isolateHistory.of('full')]});}catch(error){core?.message?.(error.message);}
 });
 return node;
}
export function makeTaskTime(iso){const time=document.createElement('time');time.className='wv-task-time';time.dateTime=iso;time.title=iso;time.textContent=localTaskTime(iso);return time;}
export function installTaskStyle(){
 if(document.getElementById('wv-task-style'))return;const s=document.createElement('style');s.id='wv-task-style';s.textContent='.wv-task-checkbox{appearance:none;display:inline-block;vertical-align:middle;width:1em;height:1em;margin:0 .25em 0 0;border:1px solid var(--text-muted);border-radius:50%;background:transparent;cursor:pointer}.wv-task-checkbox:checked{background:var(--interactive-accent);border-color:var(--interactive-accent)}.wv-task-checkbox:focus-visible{outline:2px solid var(--interactive-accent);outline-offset:2px}.wv-task-checkbox:disabled{opacity:.5;cursor:not-allowed}.wv-task-time{float:right;margin-left:1em;color:var(--text-muted);font-size:var(--font-ui-smaller,12px)}.wv-render li.wv-task-item{list-style:none}';document.head.appendChild(s);
}
