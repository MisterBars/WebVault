(function(root){'use strict';
let helpId=0;const states=new WeakMap();
function requestClose(dialog){if(!dialog||!dialog.open)return false;const e=new root.Event('cancel',{cancelable:true});if(!dialog.dispatchEvent(e))return false;dialog.close();return true;}
function foldText(section,doc){
 if(section.dataset.wvHelpFolded)return;
 const paragraphs=Array.from(section.children).filter(n=>n.tagName==='P'&&!n.hasAttribute('role')&&!n.hasAttribute('aria-live'));
 if(!paragraphs.length)return;
 const details=doc.createElement('details'),summary=doc.createElement('summary');details.className='wv-bench-explanation';summary.textContent='Как работает эта проверка';details.appendChild(summary);section.appendChild(details);for(const p of paragraphs)details.appendChild(p);section.dataset.wvHelpFolded='1';
}
function hint(input,label){
 const range='Диапазон: '+input.min+'–'+input.max+'. Нужны целые значения.';
 const meanings=[[/прогрев/i,'Предварительные повторы проверяются, но не входят в итоговую статистику.'],[/таймаут|лимит/i,'Предел ожидания, а не пауза между повторами.'],[/измеряем/i,'Успешные измеряемые повторы формируют статистику.'],[/псевдохранилищ/i,'Тестовые каталоги, не реальные учётки и не одновременные пользователи.'],[/seed/i,'Начальное число для воспроизводимого синтетического корпуса.'],[/связей/i,'Число связей на заметку должно быть меньше числа заметок.'],[/размер/i,'Объём синтетических данных; рабочие заметки не используются.']];
 const found=meanings.find(([pattern])=>pattern.test(label));return (found?found[1]+' ':'')+range;
}
function tooltips(dialog,panel){
 const doc=dialog.ownerDocument;let state=states.get(dialog);
 if(!state){state={active:null};states.set(dialog,state);dialog.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.active){state.active.hide();e.preventDefault();e.stopImmediatePropagation();}});dialog.addEventListener('close',()=>{if(state.active)state.active.hide();});}
 for(const input of panel.querySelectorAll('input[type=number]')){
  if(input.dataset.wvTooltip)continue;const label=input.closest('label');if(!label)continue;input.dataset.wvTooltip='1';
  let field=label.parentNode;if(field.classList.contains('wv-benchmark-options')){field=doc.createElement('div');label.parentNode.insertBefore(field,label);field.appendChild(label);}field.classList.add('wv-bench-field');
  const old=field.querySelector('.wv-benchmark-help'),button=doc.createElement('button'),tip=doc.createElement('span');
  tip.id='wv-bench-tip-'+(++helpId);tip.className='wv-bench-tooltip';tip.setAttribute('role','tooltip');tip.textContent=old?old.textContent:hint(input,label.textContent);tip.hidden=true;if(old)old.hidden=true;
  button.type='button';button.textContent='?';button.className='wv-bench-help-button';button.setAttribute('aria-label','Подсказка: '+label.textContent.trim());button.setAttribute('aria-describedby',tip.id);button.setAttribute('aria-controls',tip.id);button.setAttribute('data-wv-view-only','');field.appendChild(button);dialog.appendChild(tip);
  let pinned=false;const entry={hide(){tip.hidden=true;pinned=false;if(state.active===entry)state.active=null;}};
  function show(){if(state.active&&state.active!==entry)state.active.hide();state.active=entry;tip.hidden=false;const r=button.getBoundingClientRect(),width=Math.max(120,Math.min(320,(root.innerWidth||1024)-32));tip.style.width=width+'px';const height=tip.getBoundingClientRect().height||100;tip.style.left=Math.max(8,Math.min(r.left,(root.innerWidth||1024)-width-8))+'px';tip.style.top=Math.max(8,r.bottom+height+8<(root.innerHeight||768)?r.bottom+6:r.top-height-6)+'px';}
  button.addEventListener('mouseenter',show);button.addEventListener('focus',show);button.addEventListener('mouseleave',()=>{if(!pinned&&doc.activeElement!==button)entry.hide();});button.addEventListener('blur',()=>entry.hide());button.addEventListener('click',e=>{e.preventDefault();if(pinned)entry.hide();else{show();pinned=true;}});
 }
}
function compactPanel(dialog){
 if(dialog.id!=='benchmarkOptionsDialog')return;const panel=dialog.querySelector('#settingsBenchmarkPanel');if(!panel)return;
 const doc=dialog.ownerDocument;dialog.classList.add('wv-bench-compact');
 for(const [selector,title,open] of [['#benchmarkWorkloads','Дерево, Markdown и граф',true],['#benchmarkFileCycle','Файловый цикл на сервере',false],['form','Синтетический HTTP-ответ',false]]){
  const element=panel.querySelector(selector);if(!element)continue;let details=element.parentNode;
  if(!element.dataset.wvGrouped){details=doc.createElement('details');const summary=doc.createElement('summary');details.className='wv-bench-group';details.open=open;summary.textContent=title;details.appendChild(summary);element.parentNode.insertBefore(details,element);details.appendChild(element);element.dataset.wvGrouped='1';}
  if(details.hidden!==element.hidden)details.hidden=element.hidden;if(element.tagName!=='FORM')foldText(element,doc);
 }
 foldText(panel,doc);tooltips(dialog,panel);
}
function enhanceDialog(dialog){
 const doc=dialog.ownerDocument;
 if(!dialog.classList.contains('wv-dialog-enhanced')){
  let header=dialog.querySelector('.modal-header');
  if(!header){header=doc.createElement('div');header.className='modal-header';const heading=Array.from(dialog.children).find(n=>/^H[12]$/.test(n.tagName)),title=heading||doc.createElement('h2');if(!heading)title.textContent=dialog.getAttribute('aria-label')||'Окно';header.appendChild(title);
   const close=Array.from(dialog.children).find(n=>n.tagName==='BUTTON'&&/^Закрыть/.test(n.textContent.trim()))||doc.createElement('button');if(!close.parentNode){close.type='button';close.addEventListener('click',()=>requestClose(dialog));}close.textContent='×';close.setAttribute('aria-label','Закрыть окно');close.setAttribute('data-wv-view-only','');header.appendChild(close);dialog.insertBefore(header,dialog.firstChild);}
  dialog.classList.add('wv-dialog-enhanced');
 }
 compactPanel(dialog);
}
function install(doc){let scheduled=false;const scan=()=>{scheduled=false;for(const d of doc.querySelectorAll('dialog'))enhanceDialog(d);};const observer=new root.MutationObserver(records=>{const relevant=records.some(r=>r.target.closest&&r.target.closest('dialog')||Array.from(r.addedNodes||[]).some(n=>n.nodeType===1&&(n.tagName==='DIALOG'||n.querySelector&&n.querySelector('dialog'))));if(relevant&&!scheduled){scheduled=true;Promise.resolve().then(scan);}});scan();observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});return ()=>observer.disconnect();}
root.WebVaultDialogUX={requestClose,enhanceDialog,compactPanel,install};if(root.document&&root.MutationObserver)install(root.document);
})(typeof window!=='undefined'?window:globalThis);
