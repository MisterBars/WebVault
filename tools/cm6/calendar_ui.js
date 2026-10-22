import {parseDate,dateISO,daysInMonth,parseCalendarValue,composeCalendarValue,monthGrid,shiftMonth,addDays,localNow} from './calendar_model.js';
let closeActive=null,sequence=0;
const months=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
function icon(kind){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 const path=document.createElementNS(ns,'path');path.setAttribute('d',kind==='previous'?'M15 5l-7 7 7 7':kind==='next'?'M9 5l7 7-7 7':'M4 5h16v16H4z M8 2v6 M16 2v6 M4 10h16');svg.appendChild(path);return svg;
}
export function attachCalendar(input,{kind,commit=true,onError=()=>{}}){
 if(!['date','datetime'].includes(kind))throw new Error('Календарь поддерживает date/datetime.');
 installCalendarStyle();
 const original={type:input.type,placeholder:input.getAttribute('placeholder'),pattern:input.getAttribute('pattern'),value:input.value,commit:input.wvCommit};
 const field=document.createElement('div');field.className='wv-date-field';input.parentNode.insertBefore(field,input);field.appendChild(input);
 const trigger=document.createElement('button');trigger.type='button';trigger.className='wv-date-trigger';trigger.title='Открыть календарь';trigger.setAttribute('aria-label','Открыть календарь: '+(input.getAttribute('aria-label')||'дата'));trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.disabled=input.disabled;trigger.appendChild(icon('calendar'));field.appendChild(trigger);
 input.type='text';input.autocomplete='off';input.classList.add('wv-date-input');input.placeholder=kind==='date'?'YYYY-MM-DD':'YYYY-MM-DDTHH:mm[:ss]';input.removeAttribute('pattern');input.setAttribute('aria-haspopup','dialog');input.setAttribute('aria-expanded','false');
 let popup=null,observer=null,destroyed=false;
 function validate(){try{parseCalendarValue(input.value,kind);input.setCustomValidity('');return true;}catch(e){input.setCustomValidity(e.message);return false;}}
 const validateInput=()=>validate();input.addEventListener('input',validateInput,true);input.addEventListener('change',validateInput,true);validate();
 if(typeof original.commit==='function')input.wvCommit=()=>{if(!validate()){onError(input.validationMessage);return false;}return original.commit();};
 function position(){
  if(!popup)return;
  if(!input.isConnected||input.closest('[hidden]')){close(false);return;}
  const r=field.getBoundingClientRect();
  if(r.bottom<0||r.top>window.innerHeight){close(false);return;}
  const width=Math.min(340,Math.max(180,window.innerWidth-16));popup.style.width=width+'px';popup.style.left=Math.max(8,Math.min(r.left,window.innerWidth-width-8))+'px';popup.style.maxHeight=Math.max(100,window.innerHeight-16)+'px';
  const height=Math.min(popup.scrollHeight,window.innerHeight-16),below=window.innerHeight-r.bottom-8;
  if(below>=height){popup.style.top=r.bottom+4+'px';popup.style.bottom='auto';}
  else if(r.top-8>=height){popup.style.top='auto';popup.style.bottom=window.innerHeight-r.top+4+'px';}
  else{popup.style.top='8px';popup.style.bottom='auto';}
 }
 function outside(event){if(popup&&!popup.contains(event.target)&&!field.contains(event.target))close(false);}
 function close(focus=true){
  if(!popup)return;
  popup.remove();popup=null;
  if(observer)observer.disconnect();observer=null;
  document.removeEventListener('mousedown',outside,true);window.removeEventListener('scroll',position,true);window.removeEventListener('resize',position);
  for(const element of [trigger,input]){element.setAttribute('aria-expanded','false');element.removeAttribute('aria-controls');}
  if(closeActive===close)closeActive=null;
  if(focus&&input.isConnected&&!input.disabled&&!input.closest('[hidden]'))input.focus({preventScroll:true});
 }
 function open(){
  if(destroyed||input.disabled)return;
  if(popup){close();return;}if(closeActive)closeActive(false);
  closeActive=close;
  let selected='',time={hour:0,minute:0,second:0,seconds:false};
  try{const parsed=parseCalendarValue(input.value,kind);selected=parsed.date;time=parsed;}catch(_){/* Unconfirmed/invalid field stays unchanged until Apply. */}
  let focusDate=selected||localNow().date,view=focusDate.slice(0,7)+'-01',showSeconds=time.seconds;
  popup=document.createElement('section');popup.className='wv-calendar';popup.id='wv-calendar-'+(++sequence);popup.setAttribute('role','dialog');popup.setAttribute('aria-modal','false');popup.setAttribute('aria-label',kind==='date'?'Выбор даты':'Выбор локальных даты и времени');
  for(const element of [trigger,input]){element.setAttribute('aria-expanded','true');element.setAttribute('aria-controls',popup.id);}
  const header=document.createElement('div');header.className='wv-calendar-header';
  const previous=document.createElement('button');previous.type='button';previous.className='wv-calendar-nav';previous.setAttribute('aria-label','Предыдущий месяц');previous.appendChild(icon('previous'));
  const next=document.createElement('button');next.type='button';next.className='wv-calendar-nav';next.setAttribute('aria-label','Следующий месяц');next.appendChild(icon('next'));
  const title=document.createElement('h3');title.id=popup.id+'-title';title.setAttribute('aria-live','polite');header.append(previous,title,next);popup.setAttribute('aria-labelledby',title.id);
  const jump=document.createElement('div');jump.className='wv-calendar-jump';
  const monthLabel=document.createElement('label');monthLabel.textContent='Месяц';
  const monthInput=document.createElement('select');monthInput.setAttribute('aria-label','Месяц календаря');
  months.forEach((name,index)=>{const option=document.createElement('option');option.value=String(index+1);option.textContent=name;monthInput.appendChild(option);});monthLabel.appendChild(monthInput);
  const yearLabel=document.createElement('label');yearLabel.textContent='Год';
  const yearInput=document.createElement('input');yearInput.type='number';yearInput.min='0';yearInput.max='9999';yearInput.step='1';yearInput.setAttribute('aria-label','Год календаря');yearLabel.appendChild(yearInput);jump.append(monthLabel,yearLabel);
  const grid=document.createElement('div');grid.className='wv-calendar-grid';grid.setAttribute('role','grid');grid.setAttribute('aria-label','Календарь, неделя с понедельника');
  const timeBox=document.createElement('div');timeBox.className='wv-calendar-time';
  const timeInputs=[];
  if(kind==='datetime')for(const [labelText,initial,max] of [['Часы',time.hour,23],['Минуты',time.minute,59],['Секунды',time.second,59]]){
   const label=document.createElement('label');label.textContent=labelText;
   const control=document.createElement('input');control.type='number';control.min='0';control.max=String(max);control.step='1';control.value=String(initial).padStart(2,'0');control.setAttribute('aria-label',labelText);label.appendChild(control);timeBox.appendChild(label);timeInputs.push(control);
  }
  const preview=document.createElement('p');preview.className='wv-calendar-preview';preview.setAttribute('aria-live','polite');
  const message=document.createElement('p');message.className='wv-calendar-message';message.setAttribute('role','status');
  const actions=document.createElement('div');actions.className='wv-calendar-actions';
  const today=document.createElement('button');today.type='button';today.textContent='Сегодня';
  const now=document.createElement('button');now.type='button';now.textContent='Сейчас';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Отмена';
  const apply=document.createElement('button');apply.type='button';apply.className='wv-calendar-apply';apply.textContent='Применить';
  actions.appendChild(today);if(kind==='datetime')actions.appendChild(now);actions.append(cancel,apply);
  popup.append(header,jump,grid);if(kind==='datetime')popup.appendChild(timeBox);popup.append(preview,message,actions);document.body.appendChild(popup);
  function candidate(){
   if(!selected)throw new Error('Выберите дату.');
   if(!/^\d{1,4}$/.test(yearInput.value)||+yearInput.value>9999)throw new Error('Укажите год от 0 до 9999.');
   return composeCalendarValue(selected,kind,timeInputs[0]?.value,timeInputs[1]?.value,timeInputs[2]?.value,showSeconds);
  }
  function updatePreview(){try{preview.textContent=candidate();message.textContent='';apply.disabled=false;}catch(e){preview.textContent='Изменение ещё не выбрано';message.textContent=e.message;apply.disabled=true;}}
  function draw(focus=false){
   const current=parseDate(view);monthInput.value=String(current.month);yearInput.value=String(current.year);title.textContent=months[current.month-1]+' '+String(current.year).padStart(4,'0');previous.disabled=!shiftMonth(view,-1);next.disabled=!shiftMonth(view,1);
   grid.textContent='';
   const daysHeader=document.createElement('div');daysHeader.className='wv-calendar-week';daysHeader.setAttribute('role','row');
   for(const day of ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']){const cell=document.createElement('span');cell.className='wv-calendar-weekday';cell.setAttribute('role','columnheader');cell.textContent=day;daysHeader.appendChild(cell);}grid.appendChild(daysHeader);
   const todayISO=localNow().date,cells=monthGrid(view);
   for(let week=0;week<6;week++){
    const row=document.createElement('div');row.className='wv-calendar-week';row.setAttribute('role','row');
    for(const date of cells.slice(week*7,week*7+7)){
     if(!date){const blank=document.createElement('span');blank.setAttribute('role','gridcell');blank.setAttribute('aria-disabled','true');row.appendChild(blank);continue;}
     const day=document.createElement('button');day.type='button';day.className='wv-calendar-day';day.dataset.date=date;day.setAttribute('role','gridcell');day.setAttribute('aria-selected',String(date===selected));day.setAttribute('aria-label',date);day.tabIndex=date===focusDate?0:-1;day.textContent=String(parseDate(date).day);
     if(date.slice(0,7)!==view.slice(0,7))day.classList.add('is-outside-month');if(date===todayISO){day.classList.add('is-today');day.setAttribute('aria-current','date');}
     day.addEventListener('click',()=>{selected=date;focusDate=date;view=date.slice(0,7)+'-01';draw(true);});
     day.addEventListener('keydown',event=>{
      let dest=null;
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))dest=addDays(date,{ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key]);
      else if(event.key==='PageUp'||event.key==='PageDown')dest=shiftMonth(date,(event.key==='PageUp'?-1:1)*(event.shiftKey?12:1));
      else if(event.key==='Home'||event.key==='End'){const index=cells.indexOf(date)%7;dest=addDays(date,event.key==='Home'?-index:6-index);}
      else return;
      event.preventDefault();event.stopPropagation();if(dest){focusDate=dest;view=dest.slice(0,7)+'-01';draw(true);}
     });
     row.appendChild(day);
    }
    grid.appendChild(row);
   }
   updatePreview();position();if(focus){const target=Array.from(grid.querySelectorAll('[data-date]')).find(n=>n.dataset.date===focusDate);if(target){target.focus({preventScroll:true});const tr=target.getBoundingClientRect(),pr=popup.getBoundingClientRect();if(tr.top<pr.top+8)popup.scrollTop-=pr.top+8-tr.top;else if(tr.bottom>pr.bottom-8)popup.scrollTop+=tr.bottom-(pr.bottom-8);}}
  }
  function navigate(delta){const target=shiftMonth(focusDate,delta);if(!target)return;focusDate=target;view=target.slice(0,7)+'-01';draw(false);}
  function jumpTo(){
   if(!/^\d{1,4}$/.test(yearInput.value)||+yearInput.value>9999){message.textContent='Укажите год от 0 до 9999.';apply.disabled=true;return;}
   const year=+yearInput.value,month=+monthInput.value,p=parseDate(focusDate);
   focusDate=dateISO({year,month,day:Math.min(p.day,daysInMonth(year,month))});view=dateISO({year,month,day:1});draw(false);
  }
  monthInput.addEventListener('change',jumpTo);yearInput.addEventListener('change',jumpTo);
  previous.addEventListener('click',()=>navigate(-1));next.addEventListener('click',()=>navigate(1));
  today.addEventListener('click',()=>{selected=localNow().date;focusDate=selected;view=selected.slice(0,7)+'-01';draw(true);});
  now.addEventListener('click',()=>{const current=localNow();selected=current.date;focusDate=selected;view=selected.slice(0,7)+'-01';showSeconds=true;timeInputs.forEach((control,i)=>control.value=String([current.hour,current.minute,current.second][i]).padStart(2,'0'));draw(true);});
  timeInputs.forEach((control,index)=>control.addEventListener('input',()=>{if(index===2)showSeconds=true;updatePreview();}));
  cancel.addEventListener('click',()=>close());
  apply.addEventListener('click',()=>{
   let value;try{value=candidate();}catch(e){message.textContent=e.message;return;}
   const before=input.value;
   try{
    input.value=value;validate();input.dispatchEvent(new Event('input',{bubbles:true}));
    if(commit&&typeof input.wvCommit==='function'&&input.wvCommit()===false){input.value=before;validate();input.dispatchEvent(new Event('input',{bubbles:true}));message.textContent='Не удалось записать значение. Проверьте сообщение свойства и повторите после завершения операции.';return;}
    close();
   }catch(e){input.value=before;validate();message.textContent=e.message;}
  });
  popup.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}
   else if(event.key==='Tab'){
    const controls=Array.from(popup.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')).filter(n=>n.tabIndex!==-1),first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  });
  document.addEventListener('mousedown',outside,true);window.addEventListener('scroll',position,true);window.addEventListener('resize',position);
  observer=new MutationObserver(()=>{if(!input.isConnected||input.closest('[hidden]'))close(false);});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  draw(true);
 }
 trigger.addEventListener('mousedown',event=>event.preventDefault());trigger.addEventListener('click',open);
 const keydown=event=>{
  if(event.isComposing||event.keyCode===229)return;
  if(event.altKey&&event.key==='ArrowDown'){event.preventDefault();event.stopImmediatePropagation();open();}
  else if(event.key==='Escape'&&popup){event.preventDefault();event.stopImmediatePropagation();close();}
  else if(event.key==='Escape'&&commit&&input.value!==original.value){event.preventDefault();event.stopImmediatePropagation();input.value=original.value;validate();onError('');input.dispatchEvent(new Event('input',{bubbles:true}));}
 };
 input.addEventListener('keydown',keydown,true);
 return {destroy(){
  destroyed=true;close(false);input.removeEventListener('keydown',keydown,true);input.removeEventListener('input',validateInput,true);input.removeEventListener('change',validateInput,true);input.wvCommit=original.commit;input.type=original.type;input.setCustomValidity('');input.classList.remove('wv-date-input');input.removeAttribute('aria-haspopup');input.removeAttribute('aria-expanded');input.removeAttribute('aria-controls');
  if(original.placeholder===null)input.removeAttribute('placeholder');else input.setAttribute('placeholder',original.placeholder);if(original.pattern===null)input.removeAttribute('pattern');else input.setAttribute('pattern',original.pattern);
  if(field.parentNode){field.parentNode.insertBefore(input,field);field.remove();}
 }};
}
export function installCalendarStyle(){
 if(document.getElementById('wv-calendar-style'))return;
 const style=document.createElement('style');style.id='wv-calendar-style';
 style.textContent=`
.wv-date-field{display:flex;align-items:center;gap:4px;min-width:0}.wv-date-field .wv-date-input{flex:1;min-width:0}
.wv-date-trigger{display:inline-flex;align-items:center;justify-content:center;flex:none;width:30px;height:30px;min-height:0;padding:4px;border:1px solid var(--background-modifier-border);border-radius:var(--input-radius,4px);background:var(--interactive-normal);color:var(--text-muted)}
.wv-date-trigger svg,.wv-calendar-nav svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.wv-property-add-value{grid-column:1/-1;min-width:0}.wv-property-add-value>label{display:block}
.wv-calendar{position:fixed;z-index:1100;box-sizing:border-box;overflow:auto;padding:10px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-m,6px);background:var(--wv-calendar-background,var(--background-primary));color:var(--text-normal);font:var(--font-ui-small,14px) var(--font-interface,sans-serif);box-shadow:0 6px 24px var(--background-modifier-box-shadow,rgba(0,0,0,.3))}
.wv-calendar button{font:inherit;color:var(--text-normal);background:var(--interactive-normal);border:1px solid var(--background-modifier-border);border-radius:var(--input-radius,4px);min-height:28px;padding:4px 7px}
.wv-calendar button:hover:not(:disabled){background:var(--interactive-hover)}.wv-calendar button:focus-visible,.wv-calendar input:focus-visible{outline:2px solid var(--interactive-accent);outline-offset:1px}
.wv-calendar-header{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:8px}.wv-calendar-header h3{margin:0;font:inherit;font-weight:600}.wv-calendar-nav{display:inline-flex;align-items:center;justify-content:center}
.wv-calendar-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px}.wv-calendar-weekday{padding:4px 0;text-align:center;color:var(--text-muted)}
.wv-calendar .wv-calendar-day{padding:4px 0;min-width:0;background:transparent;border:1px solid transparent}.wv-calendar .wv-calendar-day.is-outside-month{color:var(--text-faint)}.wv-calendar .wv-calendar-day.is-today{border-color:var(--interactive-accent)}
.wv-calendar .wv-calendar-day[aria-selected=true]{background:var(--interactive-accent);color:var(--text-on-accent,var(--text-normal))}
.wv-calendar-jump{display:grid;grid-template-columns:minmax(0,1fr) 90px;gap:8px;margin-bottom:8px}.wv-calendar-jump label{margin:0;color:var(--text-muted);min-width:0}.wv-calendar-jump input,.wv-calendar-jump select{width:100%;min-width:0;padding:4px;background:var(--background-modifier-form-field);color:var(--text-normal);border:1px solid var(--background-modifier-border);border-radius:var(--input-radius,4px);font:inherit}
.wv-calendar-time{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px}.wv-calendar-time label{margin:0;min-width:0;color:var(--text-muted)}
.wv-calendar-time input{width:100%;min-width:0;margin-top:3px;padding:4px;background:var(--background-modifier-form-field);color:var(--text-normal);border:1px solid var(--background-modifier-border);border-radius:var(--input-radius,4px);font:inherit}
.wv-calendar-preview{margin:8px 0;overflow-wrap:anywhere;color:var(--text-muted)}.wv-calendar-message{margin:6px 0;overflow-wrap:anywhere;color:var(--text-error)}.wv-calendar-message:empty{display:none}
.wv-calendar-actions{display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}.wv-calendar .wv-calendar-apply{background:var(--interactive-accent);color:var(--text-on-accent,var(--text-normal))}
`;
 document.head.appendChild(style);window.__WV_CALENDAR_TEST='calendar-09';
}
