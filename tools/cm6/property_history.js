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
  for(const root of scope().querySelectorAll('.wv-properties')){
   if(!root.querySelector('[data-wv-history]')){
    const heading=root.querySelector('h3');
    if(heading){if(heading.parentElement===root)heading.remove();else heading.parentElement.remove();appendPropertyHistory(root,heading,forCurrentNote());root.prepend(root.lastElementChild);}
   }
  }
  for(const button of noteRoot.querySelectorAll('[data-wv-history]')){
   const controller=button.wvHistoryController;if(!controller)continue;
   const s=controller.status();button.disabled=button.dataset.wvHistory==='undo'?!s.canUndo:!s.canRedo;
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
 window.WebVaultHistory={undo:()=>act('undo'),redo:()=>act('redo'),status:()=>status()};
 return {forCurrentNote,refresh};
}
export function appendPropertyHistory(root,heading,history){
 const header=document.createElement('div');header.className='wv-property-header';header.appendChild(heading);
 if(history){
  const actions=document.createElement('div');actions.className='wv-property-history-actions';
  for(const [direction,label,glyph] of [['undo','Отменить изменение заметки (Ctrl+Z)','↶'],['redo','Повторить изменение заметки (Ctrl+Y)','↷']]){
   const button=document.createElement('button');button.type='button';button.className='wv-property-history-button';button.dataset.wvHistory=direction;button.wvHistoryController=history;button.title=label;button.setAttribute('aria-label',label);button.textContent=glyph;
   const s=history.status();button.disabled=direction==='undo'?!s.canUndo:!s.canRedo;
   button.addEventListener('mousedown',e=>e.preventDefault());
   button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();history[direction]();});actions.appendChild(button);
  }
  header.appendChild(actions);
 }
 root.appendChild(header);
 installPropertyHistoryStyle();
}
function installPropertyHistoryStyle(){
 if(document.getElementById('wv-property-history-style'))return;
 const style=document.createElement('style');style.id='wv-property-history-style';
 style.textContent=`
.wv-properties-v2 .wv-property-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}
.wv-properties-v2 .wv-property-header h3{margin:0}
.wv-property-history-actions{display:flex;gap:4px}
.wv-property-history-button{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;min-height:0;padding:0;border:0;border-radius:var(--radius-s,4px);background:transparent;color:var(--text-muted);font:inherit;font-size:18px}
.wv-property-history-button:hover{background:var(--background-modifier-hover);color:var(--text-normal)}
.wv-property-history-button:disabled{opacity:.4;cursor:default}
`;
 document.head.appendChild(style);
}
