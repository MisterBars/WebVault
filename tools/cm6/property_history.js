import {hasTableDraft} from './table_ui.js';
import {appendNoteHistoryButtons,historyButtonState,installNoteHistoryStyle} from './note_history_controls.js';
import {Transaction} from '@codemirror/state';
import {undo,redo,undoDepth,redoDepth,isolateHistory} from '@codemirror/commands';
import {historyShortcut,isPropertyDraft,mayUseDocumentHistory} from './property_history_policy.js';
export function commitPropertyChange(view,change){
 view.dispatch({changes:change,annotations:[Transaction.userEvent.of('input.properties'),isolateHistory.of('full')]});
}
export function installPropertyHistory({getView,getMode,area,reading,app,getEntries,noteRoot}){
 const identity=()=>JSON.stringify([app.state.user&&app.state.user.id,app.state.note]);
 function scope(){return getMode()===2?reading:getView().dom;}
 function draftPresent(){
  if(hasTableDraft())return true;
  const root=scope();
  if(root.querySelector('.wv-property-add-form,.wv-property-type-panel'))return true;
  const entries=getEntries(getView().state.doc.toString());
  for(const control of root.querySelectorAll('[data-wv-property]')){
   const entry=entries.find(e=>e.key===control.dataset.wvProperty);
   if(isPropertyDraft({value:control.value,type:control.type,checked:control.checked,list:control.classList.contains('wv-property-list-input')},entry))return true;
  }
  return false;
 }
 function status(owner=identity()){
  const view=getView(),S=app.state;
  const writable=owner===identity()&&mayUseDocumentHistory({user:S.user,note:S.note,hasVault:S.hasVault,disabled:area.disabled,readOnly:area.readOnly,busy:app.isBusy(),stateReadOnly:view.state.readOnly});
  const blockedByDraft=writable&&draftPresent();
  const depths={undoDepth:undoDepth(view.state),redoDepth:redoDepth(view.state)};
  return {...depths,mode:getMode(),writable,blockedByDraft,canUndo:writable&&!blockedByDraft&&depths.undoDepth>0,canRedo:writable&&!blockedByDraft&&depths.redoDepth>0};
 }
 function refresh(){
  for(const button of noteRoot.querySelectorAll('[data-wv-history]')){
   const controller=button.wvHistoryController;if(!controller)continue;
   const state=historyButtonState(button.dataset.wvHistory,controller.status());button.disabled=state.disabled;button.title=state.title;
  }
 }
 function act(direction,owner=identity()){
  const s=status(owner);
  if(!s.writable)return false;
  if(s.blockedByDraft){app.message('Сначала подтвердите поле через Enter/Ctrl+S или завершите/отмените открытый диалог свойств.');return false;}
  const active=document.activeElement,key=active&&active.dataset&&active.dataset.wvProperty;
  const ok=(direction==='undo'?undo:redo)(getView());
  if(ok)queueMicrotask(()=>{
   if(owner!==identity())return;
   const target=key&&Array.from(scope().querySelectorAll('[data-wv-property]')).find(n=>n.dataset.wvProperty===key&&!n.disabled);
   if(target)target.focus({preventScroll:true});
   else if(getMode()===2){reading.tabIndex=-1;reading.focus({preventScroll:true});}
   else getView().focus();
   refresh();
  });
  else refresh();
  return ok;
 }
 function forCurrentNote(){
  const owner=identity();
  return {status:()=>status(owner),undo:()=>act('undo',owner),redo:()=>act('redo',owner)};
 }
 document.addEventListener('keydown',event=>{
  const direction=historyShortcut(event);if(!direction||document.querySelector('dialog[open]'))return;
  const target=event.target;
  if(!(target instanceof Element))return;
  if(target!==document.body&&!noteRoot.contains(target))return;
  const insideProperties=!!target.closest('.wv-properties');
  const native=target.closest('input,textarea,select,[contenteditable="true"]');
  if(native&&!insideProperties&&!getView().contentDOM.contains(target))return;
  const s=status();
  if(!s.writable||s.blockedByDraft)return;
  event.preventDefault();event.stopImmediatePropagation();act(direction);
 },true);
 const historyHost=noteRoot.querySelector('.view-actions');
 if(historyHost)appendNoteHistoryButtons(historyHost,{status:()=>status(),undo:()=>act('undo'),redo:()=>act('redo')});
 else app.message('Не найдена верхняя панель для кнопок истории заметки.');
 let refreshPending=false;
 function scheduleRefresh(){if(refreshPending)return;refreshPending=true;queueMicrotask(()=>{refreshPending=false;refresh();});}
 for(const type of ['input','change','keyup','focusin'])noteRoot.addEventListener(type,scheduleRefresh,true);
 refresh();
 window.__WV_HISTORY_UI_TEST='history-toolbar-07';
 window.WebVaultHistory={undo:()=>act('undo'),redo:()=>act('redo'),status:()=>status()};
 return {forCurrentNote,refresh};
}
export function appendPropertyHistory(root,heading,history){
 const header=document.createElement('div');header.className='wv-property-header';header.appendChild(heading);root.appendChild(header);
 installPropertyHistoryStyle();
}

function installPropertyHistoryStyle(){installNoteHistoryStyle();}
