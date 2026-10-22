import {attachCalendar,installCalendarStyle} from './calendar_ui.js';
import {PROPERTY_TYPES,TYPE_LABELS,TYPE_ICONS,STANDARD_PROPERTIES,propertyNameHints,normalisePropertyName} from './property_add_model.js';
export function appendPropertyAdder(root,{entries,readOnly,onAdd,getNameSuggestions,restoreFocus}) {
  if(readOnly)return;
  const button=document.createElement('button');
  button.type='button';button.className='wv-property-add-button';button.textContent='＋ Добавить свойство';
  root.appendChild(button);
  let form=null;
  button.addEventListener('click',()=>{
    if(form){form.querySelector('input').focus();return;}
    button.hidden=true;
    form=document.createElement('form');form.className='wv-property-add-form';
    const nameLabel=document.createElement('label');nameLabel.textContent='Имя свойства';
    const wrap=document.createElement('div');wrap.className='wv-property-name-picker';
    const name=document.createElement('input');name.type='text';name.autocomplete='off';name.maxLength=128;name.required=true;name.setAttribute('aria-label','Имя нового свойства');
    name.setAttribute('role','combobox');name.setAttribute('aria-autocomplete','list');name.setAttribute('aria-expanded','false');
    const menu=document.createElement('div');menu.className='wv-property-name-menu';menu.setAttribute('role','listbox');menu.hidden=true;
    menu.id='wv-property-names-'+Math.random().toString(36).slice(2);
    const typeLabel=document.createElement('label');typeLabel.textContent='Начальный тип';
    const type=document.createElement('select');type.setAttribute('aria-label','Тип нового свойства');
    for(const key of PROPERTY_TYPES){const option=document.createElement('option');option.value=key;option.textContent=TYPE_ICONS[key]+' '+TYPE_LABELS[key];type.appendChild(option);}
    const valueLabel=document.createElement('div');valueLabel.className='wv-property-add-value';
    const valueCaption=document.createElement('label');valueCaption.textContent='Начальное значение';
    const value=document.createElement('input');value.setAttribute('aria-label','Начальное значение');value.id='wv-new-property-value-'+Math.random().toString(36).slice(2);valueCaption.htmlFor=value.id;valueLabel.appendChild(valueCaption);
    const status=document.createElement('div');status.className='wv-property-add-status';status.setAttribute('role','status');
    const actions=document.createElement('div');actions.className='wv-property-add-actions';
    const submit=document.createElement('button');submit.type='submit';submit.textContent='Добавить';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Отмена';
    actions.append(submit,cancel);wrap.append(name,menu);nameLabel.appendChild(wrap);typeLabel.appendChild(type);valueLabel.appendChild(value);
    form.append(nameLabel,typeLabel,valueLabel,status,actions);root.appendChild(form);
    let known=[],options=[],active=-1,loading=false,disposed=false;
    const existing=entries.map(e=>e.key);
    let calendar=null;
    function hide(){menu.hidden=true;name.setAttribute('aria-expanded','false');name.removeAttribute('aria-activedescendant');name.removeAttribute('aria-controls');active=-1;}
    function discard(){disposed=true;if(calendar){calendar.destroy();calendar=null;}form.remove();form=null;button.hidden=false;button.focus({preventScroll:true});}
    function configure(){
      if(calendar){calendar.destroy();calendar=null;}
      value.value='';value.checked=false;value.required=false;value.step='any';
      value.type=type.value==='checkbox'?'checkbox':type.value==='date'?'date':type.value==='datetime'?'datetime-local':type.value==='number'?'number':'text';
      value.required=['date','datetime','number'].includes(type.value);
      if(type.value==='number')value.value='0';
      value.placeholder=type.value==='list'?'Первое значение (необязательно)':'';
      valueLabel.firstChild.textContent=type.value==='list'?'Первое значение (необязательно)':'Начальное значение';
      if(['date','datetime'].includes(type.value))calendar=attachCalendar(value,{kind:type.value,commit:false,onError:message=>{status.textContent=message;}});
    }
    function applyTypeHint(){
      const key=name.value.trim().toLowerCase();
      const hint=STANDARD_PROPERTIES.find(p=>p.key===key)||propertyNameHints([{propertyNames:known}],[],name.value).find(p=>p.key.toLowerCase()===key);
      type.disabled=!!STANDARD_PROPERTIES.find(p=>p.key===key);
      if(hint && type.value!==hint.type){type.value=hint.type;configure();}
      if(hint&&hint.mixed)status.textContent='В заметках встречаются разные типы. Выберите начальный тип для этой заметки.';
    }
    function choose(hint){name.value=hint.key;type.value=hint.type;configure();applyTypeHint();hide();value.focus();}
    function highlight(){
      Array.from(menu.children).forEach((el,i)=>el.setAttribute('aria-selected',String(i===active)));
      if(active>=0){name.setAttribute('aria-activedescendant',menu.children[active].id);menu.children[active].scrollIntoView({block:'nearest'});}
      else name.removeAttribute('aria-activedescendant');
    }
    function show(){
      if(disposed||document.activeElement!==name)return;
      options=propertyNameHints([{propertyNames:known}],existing,name.value);
      menu.textContent='';active=-1;
      for(const [i,hint] of options.entries()){
        const item=document.createElement('div');item.className='wv-property-name-option';item.id=menu.id+'-'+i;item.setAttribute('role','option');
        const icon=document.createElement('span');icon.className='wv-property-type-icon';icon.setAttribute('aria-hidden','true');icon.textContent=hint.mixed?'?':TYPE_ICONS[hint.type];
        const label=document.createElement('span');label.textContent=hint.key;
        item.append(icon,label);item.title=hint.standard?'Стандартное поле':hint.mixed?'Встречаются разные типы':TYPE_LABELS[hint.type];
        item.addEventListener('mousedown',e=>e.preventDefault());item.addEventListener('click',()=>choose(hint));menu.appendChild(item);
      }
      menu.hidden=!options.length;name.setAttribute('aria-expanded',String(options.length>0));
      if(options.length)name.setAttribute('aria-controls',menu.id);else name.removeAttribute('aria-controls');
    }
    async function load(){
      show();if(loading||!getNameSuggestions)return;loading=true;
      try{
        const result=await getNameSuggestions();
        if(disposed||!name.isConnected)return;
        known=Array.isArray(result)?result:[];show();if(document.activeElement===name)applyTypeHint();
      }catch(e){if(!disposed&&name.isConnected)status.textContent='Имена из индекса недоступны: '+e.message+'. Можно ввести новое имя.';}
      finally{loading=false;}
    }
    name.addEventListener('focus',load);
    name.addEventListener('input',()=>{status.textContent='';applyTypeHint();show();});
    name.addEventListener('blur',hide);
    name.addEventListener('keydown',e=>{
      if(e.isComposing||e.keyCode===229)return;
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){
        e.preventDefault();if(menu.hidden)show();if(!options.length)return;
        active=e.key==='ArrowDown'?(active+1)%options.length:(active<=0?options.length-1:active-1);highlight();
      }else if(e.key==='Enter'){
        e.preventDefault();e.stopPropagation();if(active>=0&&!menu.hidden)choose(options[active]);else{applyTypeHint();hide();value.focus();}
      }else if(e.key==='Escape'&&!menu.hidden){e.preventDefault();e.stopImmediatePropagation();hide();}
    });
    form.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();discard();}});
    cancel.addEventListener('click',discard);
    type.addEventListener('change',configure);
    let adding=false;
    form.addEventListener('submit',e=>{
      e.preventDefault();e.stopPropagation();if(adding)return;
      try{
        const key=normalisePropertyName(name.value);
        const otherDraft=Array.from(root.querySelectorAll('[data-wv-property]')).find(control=>control.classList.contains('wv-property-list-input')&&control.value.trim());
        if(otherDraft)throw new Error('Сначала подтвердите незавершённый ввод списка через Enter или Ctrl+S.');
        adding=true;onAdd(key,type.value,type.value==='checkbox'?value.checked:value.value);
        disposed=true;
        if(restoreFocus)queueMicrotask(()=>restoreFocus(key));
      }catch(error){adding=false;status.textContent=error.message;}
    });
    configure();name.focus();
  });
}
export function installPropertyAdderStyle(){
 installCalendarStyle();
 if(document.getElementById('wv-property-add-style'))return;
 const style=document.createElement('style');style.id='wv-property-add-style';
 style.textContent=`
.wv-properties-v2 .wv-property-add-button{display:block;width:100%;margin:4px 0;padding:6px;border:1px solid transparent;border-radius:var(--radius-s,4px);background:transparent;color:var(--text-muted);font:inherit;text-align:left}
.wv-properties-v2 .wv-property-add-button:hover{background:var(--background-modifier-hover);color:var(--text-normal)}
.wv-property-add-form{display:grid;grid-template-columns:minmax(0,1fr) minmax(100px,150px);gap:8px;padding:8px 6px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-s,4px);font:inherit}
.wv-property-add-form label{min-width:0;margin:0;color:var(--text-muted);font:inherit}
.wv-property-add-form input:not([type=checkbox]),.wv-property-add-form select{width:100%;min-width:0;margin-top:4px;padding:5px;background:var(--background-modifier-form-field);color:var(--text-normal);border:1px solid var(--background-modifier-border);border-radius:var(--input-radius,4px);font:inherit}
.wv-property-add-form label:nth-child(3),.wv-property-add-status,.wv-property-add-actions{grid-column:1/-1}
.wv-property-add-actions{display:flex;gap:8px}.wv-property-add-status{color:var(--text-error);overflow-wrap:anywhere}.wv-property-add-status:empty{display:none}
.wv-property-name-picker{position:relative}.wv-property-name-menu{position:absolute;left:0;right:0;top:100%;z-index:80;max-height:200px;overflow:auto;padding:4px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-m,6px);background:var(--background-primary);color:var(--text-normal)}
.wv-property-name-option{display:flex;align-items:center;gap:8px;padding:6px;border-radius:var(--radius-s,4px);cursor:pointer;overflow-wrap:anywhere}
.wv-property-name-option:hover,.wv-property-name-option[aria-selected=true]{background:var(--background-modifier-hover)}.wv-property-type-icon{width:20px;flex:none;color:var(--text-muted)}
@media(max-width:550px){.wv-property-add-form{grid-template-columns:minmax(0,1fr)}}
`;
 document.head.appendChild(style);
}
