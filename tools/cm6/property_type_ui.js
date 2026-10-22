import {CONVERSION_TYPES} from './property_type_model.js';
import {TYPE_LABELS} from './property_add_model.js';
function findDraft(root,entries){
 for(const control of root.querySelectorAll('[data-wv-property]')){
  const entry=entries.find(e=>e.key===control.dataset.wvProperty);
  if(!entry)continue;
  if(control.classList.contains('wv-property-list-input')){if(control.value.trim())return control;continue;}
  const value=control.type==='checkbox'?control.checked:entry.type==='number'&&control.value!==''?Number(control.value):control.value;
  if(JSON.stringify(value)!==JSON.stringify(entry.value))return control;
 }
 return null;
}
export function attachPropertyTypeControl(button,{entry,root,row,error,entries,readOnly,preview,onCommit,restoreFocus}){
 button.setAttribute('aria-label','Изменить тип свойства '+entry.key);
 button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');
 button.disabled=readOnly||entry.readonly||!onCommit;
 button.title=entry.readonly?'Сложное значение: редактирование в исходнике':'Изменить тип: '+(TYPE_LABELS[entry.type==='tags'?'list':entry.type]||entry.type);
 let panel=null;
 function close(focus=true){if(panel)panel.remove();panel=null;button.setAttribute('aria-expanded','false');if(focus&&button.isConnected)button.focus({preventScroll:true});}
 function ready(){
  if(root.querySelector('.wv-property-add-form')){error.textContent='Сначала завершите или отмените добавление нового свойства.';return false;}
  const draft=findDraft(root,entries);
  if(draft){error.textContent='Сначала подтвердите изменение поля через Enter/Ctrl+S или очистите незавершённый ввод.';draft.focus();return false;}
  error.textContent='';return true;
 }
 button.addEventListener('mousedown',e=>e.preventDefault());
 button.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  if(panel&&!panel.isConnected)panel=null;
  if(panel){close();return;}if(button.disabled||!ready())return;
  for(const other of root.querySelectorAll('.wv-property-type-panel'))other.remove();
  for(const other of root.querySelectorAll('.wv-property-type-button'))other.setAttribute('aria-expanded','false');
  panel=document.createElement('section');panel.className='wv-property-type-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Тип свойства '+entry.key);
  button.setAttribute('aria-expanded','true');
  const label=document.createElement('label');label.textContent='Новый тип';
  const select=document.createElement('select');select.setAttribute('aria-label','Новый тип свойства '+entry.key);
  for(const type of CONVERSION_TYPES){const option=document.createElement('option');option.value=type;option.textContent=TYPE_LABELS[type];select.appendChild(option);}
  select.value=entry.type==='tags'?'list':entry.type;label.appendChild(select);
  const caption=document.createElement('p');caption.textContent='Предпросмотр значения (JSON):';
  const before=document.createElement('pre');before.className='wv-property-type-before';before.textContent='Было: '+JSON.stringify(entry.value);
  const after=document.createElement('pre');after.className='wv-property-type-after';
  const message=document.createElement('p');message.className='wv-property-type-message';message.setAttribute('role','status');
  const actions=document.createElement('div');actions.className='wv-property-type-actions';
  const apply=document.createElement('button');apply.type='button';apply.textContent='Применить';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Отмена';actions.append(apply,cancel);
  panel.append(label,caption,before,after,message,actions);row.querySelector('.wv-property-value').appendChild(panel);
  function update(){
   try{const result=preview(select.value);after.textContent='Станет: '+JSON.stringify(result.value);message.textContent=result.change?result.warning:'Этот тип уже установлен.';apply.disabled=!result.change;}
   catch(e){after.textContent='Изменение не выполнено';message.textContent=e.message;apply.disabled=true;}
  }
  select.addEventListener('change',update);
  cancel.addEventListener('click',()=>close());
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();close();}});
  apply.addEventListener('click',()=>{
   if(!ready())return;
   try{
    const result=preview(select.value);
    if(result.change)onCommit(result.change);
    close(false);
    if(restoreFocus)queueMicrotask(()=>restoreFocus(entry.key));
   }catch(e){if(panel)message.textContent=e.message;else error.textContent=e.message;}
  });
  update();select.focus();
 });
}
export function installPropertyTypeStyle(){
 if(document.getElementById('wv-property-type-style'))return;
 const style=document.createElement('style');style.id='wv-property-type-style';
 style.textContent=`
.wv-properties-v2 .wv-property-name-cell{display:flex;gap:8px;align-items:flex-start;min-width:0}
.wv-properties-v2 .wv-property-name-cell .wv-property-name{flex:1;min-width:0}
.wv-properties-v2 .wv-property-type-button{display:inline-flex;align-items:center;justify-content:center;flex:none;width:20px;min-width:20px;height:26px;min-height:0;margin:3px 0 0;padding:0;background:transparent;border:0;border-radius:var(--radius-s,4px);font:inherit;font-size:12px;color:var(--text-muted)}
.wv-properties-v2 .wv-property-type-button:hover{background:var(--background-modifier-hover);color:var(--text-normal)}
.wv-properties-v2 .wv-property-type-button:disabled{opacity:.5;cursor:not-allowed}
.wv-property-type-panel{margin:6px 0;padding:8px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-m,6px);background:var(--background-primary);color:var(--text-normal);font:inherit}
.wv-property-type-panel label{margin:0;color:var(--text-muted)}.wv-property-type-panel select{display:block;width:100%;margin-top:4px;padding:5px;background:var(--background-modifier-form-field);color:var(--text-normal);border:1px solid var(--background-modifier-border);border-radius:var(--input-radius,4px);font:inherit}
.wv-property-type-panel p{margin:6px 0;color:var(--text-muted)}.wv-property-type-panel pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:140px;padding:4px;color:var(--text-normal);font:inherit}
.wv-property-type-actions{display:flex;gap:8px;margin-top:8px}
`;
 document.head.appendChild(style);
}
