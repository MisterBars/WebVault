import {isPropertyDraft} from './property_history_policy.js';
export function attachPropertyRemoval(root,entries,{readOnly=true,onCommit,restoreFocus}={},removeChange){
 installRemovalStyle();
 const rows=Array.from(root.querySelectorAll('.wv-property-row'));
 entries.forEach((entry,index)=>{
  const row=rows[index],cell=row&&row.querySelector('.wv-property-name-cell'),error=row&&row.querySelector('.wv-property-error');if(!cell||!error)return;
  const button=document.createElement('button');button.type='button';button.className='wv-property-remove-button';button.textContent='×';button.setAttribute('aria-label','Удалить свойство '+entry.key);button.title=entry.readonly?'Сложное свойство: удаление в исходнике':'Удалить свойство '+entry.key;button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.disabled=readOnly||entry.readonly||!onCommit;cell.appendChild(button);
  let panel=null;
  function close(focus=true){if(panel)panel.remove();panel=null;button.setAttribute('aria-expanded','false');if(focus&&button.isConnected)button.focus({preventScroll:true});}
  function ready(){
   if(!root.isConnected||button.disabled)return false;
   if(root.querySelector('.wv-property-add-form')||Array.from(root.querySelectorAll('.wv-property-type-panel')).some(node=>node!==panel)){error.textContent='Сначала завершите или отмените открытый диалог свойств.';return false;}
   for(const control of root.querySelectorAll('[data-wv-property]')){
    const current=entries.find(e=>e.key===control.dataset.wvProperty);
    if(isPropertyDraft({value:control.value,type:control.type,checked:control.checked,list:control.classList.contains('wv-property-list-input')},current)){error.textContent='Сначала подтвердите ввод через Enter/Ctrl+S или отмените черновик.';control.focus();return false;}
   }
   error.textContent='';return true;
  }
  button.addEventListener('mousedown',event=>event.preventDefault());
  button.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();if(panel&&!panel.isConnected)panel=null;
   if(panel){close();return;}if(!ready())return;
   panel=document.createElement('section');panel.className='wv-property-type-panel wv-property-remove-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Удаление свойства '+entry.key);button.setAttribute('aria-expanded','true');
   const message=document.createElement('p');message.textContent='Удалить свойство «'+entry.key+'» целиком из этой заметки? Отменить удаление можно через Undo.';
   const actions=document.createElement('div');actions.className='wv-property-type-actions';
   const apply=document.createElement('button');apply.type='button';apply.textContent='Удалить свойство';
   const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Отмена';actions.append(apply,cancel);panel.append(message,actions);row.querySelector('.wv-property-value').appendChild(panel);
   cancel.addEventListener('click',()=>close());panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();close();}});
   apply.addEventListener('click',()=>{
    if(!ready())return;
    try{const change=removeChange(entry.key);onCommit(change);close(false);const next=entries[index+1]||entries[index-1];if(next&&restoreFocus)queueMicrotask(()=>restoreFocus(next.key));}catch(e){error.textContent=e.message;}
   });cancel.focus({preventScroll:true});
  });
 });
}
function installRemovalStyle(){
 if(document.getElementById('wv-property-remove-style'))return;
 const style=document.createElement('style');style.id='wv-property-remove-style';style.textContent=`.wv-properties-v2 .wv-property-remove-button{flex:none;width:22px;min-width:22px;height:26px;min-height:0;margin:3px 0 0;padding:0;border:0;border-radius:var(--radius-s,4px);background:transparent;color:var(--text-muted);font:inherit;cursor:pointer}.wv-properties-v2 .wv-property-remove-button:hover{background:var(--background-modifier-hover);color:var(--text-error,var(--text-normal))}.wv-properties-v2 .wv-property-remove-button:disabled{opacity:.4;cursor:not-allowed}`;document.head.appendChild(style);window.__WV_PROPERTY_REMOVE_TEST='properties-remove-16';
}
