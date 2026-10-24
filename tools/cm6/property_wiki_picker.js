import {hasPropertyWiki,propertyWikiDraft,propertyLinkDraft,propertyLinkChoices,validatePropertyLinks} from './property_link_model.js';
let serial=0;
export function attachPropertyWikiPicker(input,field,{getLinkSuggestions,onError=()=>{},closeNormal=()=>{},enabled=()=>true,validateValue=validatePropertyLinks,menuLabel='Выбор заметки для свойства'}){
 installPropertyWikiStyle();
 const id='wv-property-wiki-'+(++serial),originalCommit=input.wvCommit,initial=input.value;
 const saved={};for(const attr of ['role','aria-autocomplete','aria-expanded','aria-controls','aria-activedescendant'])saved[attr]=input.getAttribute(attr);
 if(input.tagName!=='TEXTAREA')input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');if(input.tagName!=='TEXTAREA')input.setAttribute('aria-expanded','false');
 let popup=null,items=[],active=0,snapshot=null,pending=null,epoch=0,observer=null,composing=false,destroyed=false,review=null;
 const listeners=[];
 const listen=(type,handler,capture=false)=>{input.addEventListener(type,handler,capture);listeners.push([type,handler,capture]);};
 function context(){return enabled()?propertyWikiDraft(input.value,input.selectionStart??input.value.length):null;}
 function close(){
  epoch++;if(popup)popup.remove();popup=null;items=[];active=0;
  if(input.getAttribute('aria-controls')===id){if(input.tagName!=='TEXTAREA')input.setAttribute('aria-expanded','false');input.removeAttribute('aria-controls');input.removeAttribute('aria-activedescendant');}
  window.removeEventListener('scroll',position,true);window.removeEventListener('resize',position);window.removeEventListener('webvault:catalog-invalidated',invalidate);
  if(observer)observer.disconnect();observer=null;
 }
 function invalidate(){snapshot=null;close();}
 function position(){
  if(!popup)return;if(!input.isConnected||input.closest('[hidden]')||document.activeElement!==input){close();return;}
  const r=field.getBoundingClientRect(),width=Math.min(Math.max(r.width,260),Math.max(100,window.innerWidth-16));
  popup.style.width=width+'px';popup.style.left=Math.max(8,Math.min(r.left,window.innerWidth-width-8))+'px';popup.style.maxHeight=Math.max(80,Math.min(280,window.innerHeight-16))+'px';
  const height=Math.min(popup.scrollHeight,280,window.innerHeight-16),below=window.innerHeight-r.bottom-8;
  if(below>=height){popup.style.top=r.bottom+3+'px';popup.style.bottom='auto';}
  else if(r.top>=height+8){popup.style.top='auto';popup.style.bottom=window.innerHeight-r.top+3+'px';}
  else{popup.style.top='8px';popup.style.bottom='auto';}
 }
 function mount(){
  if(popup)return;popup=document.createElement('div');popup.id=id;popup.className='wv-property-wiki-menu';popup.setAttribute('role','listbox');popup.setAttribute('aria-label',menuLabel);document.body.appendChild(popup);
  input.setAttribute('aria-controls',id);if(input.tagName!=='TEXTAREA')input.setAttribute('aria-expanded','true');
  window.addEventListener('scroll',position,true);window.addEventListener('resize',position);window.addEventListener('webvault:catalog-invalidated',invalidate);
  observer=new MutationObserver(()=>{if(!input.isConnected||input.closest('[hidden]')||document.activeElement!==input)close();});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']});
 }
 function highlight(){
  if(!popup)return;Array.from(popup.querySelectorAll('[role=option]')).forEach((item,i)=>item.setAttribute('aria-selected',String(i===active)));
  const node=popup.querySelectorAll('[role=option]')[active];
  if(node){input.setAttribute('aria-activedescendant',node.id);if(node.offsetTop<popup.scrollTop)popup.scrollTop=node.offsetTop;else if(node.offsetTop+node.offsetHeight>popup.scrollTop+popup.clientHeight)popup.scrollTop=node.offsetTop+node.offsetHeight-popup.clientHeight;}
 }
 function choose(path){
  if(destroyed||!input.isConnected||!enabled()){close();return;}
  try{
   if(!snapshot||!snapshot.isCurrent())throw new Error('Каталог изменился. Выберите заметку заново.');
   const draft=propertyLinkDraft(input.value,input.selectionStart??input.value.length,path),chosen=snapshot;
   close();closeNormal();input.value=draft.value;review={...draft,snapshot:chosen};input.focus({preventScroll:true});input.setSelectionRange(draft.selectionStart,draft.selectionEnd);onError('');
   input.dispatchEvent(new Event('input',{bubbles:true}));
  }catch(error){onError(error.message);close();}
 }
 function render(){
  const c=context();if(!c?.canSuggest||!input.isConnected||document.activeElement!==input){close();return;}
  closeNormal();items=propertyLinkChoices(snapshot.paths,c.query,snapshot.sourcePath);if(!items.length){close();return;}
  mount();popup.textContent='';active=0;
  items.forEach((item,index)=>{
   const node=document.createElement('div');node.className='wv-property-wiki-option';node.id=id+'-'+index;node.setAttribute('role','option');
   const name=document.createElement('div');name.className='wv-property-wiki-name';name.textContent=item.name;
   const path=document.createElement('div');path.className='wv-property-wiki-path';path.textContent=item.path;node.append(name,path);
   node.addEventListener('mousedown',e=>e.preventDefault());node.addEventListener('click',()=>choose(item.path));popup.appendChild(node);
  });
  const help=document.createElement('div');help.className='wv-property-wiki-help';help.setAttribute('role','presentation');help.setAttribute('aria-hidden','true');help.textContent='Выберите заметку, измените выделенную подпись, затем Enter';popup.appendChild(help);highlight();position();
 }
 async function refresh(force=false){
  if(destroyed||input.disabled||composing||!input.isConnected||document.activeElement!==input)return;
  if(hasPropertyWiki(input.value))closeNormal();
  const c=context();if(!c?.canSuggest){close();return;}
  if(force)snapshot=null;
  if(snapshot&&snapshot.isCurrent()){render();return;}
  const version=epoch;
  if(!pending)pending=Promise.resolve().then(()=>getLinkSuggestions({refresh:force}));
  const promise=pending;
  try{const result=await promise;if(version!==epoch||!input.isConnected||document.activeElement!==input)return;if(!result.isCurrent())throw new Error('Заметка или каталог изменились.');snapshot=result;render();}
  catch(error){if(version===epoch&&input.isConnected){onError('Подсказки ссылок: '+error.message);close();}}
  finally{if(pending===promise)pending=null;}
 }
 function validate(report=true){
  if(input.value===initial&&!review){input.setCustomValidity('');return true;}
  try{
   validateValue(input.value);
   if(review&&input.value.slice(review.open).startsWith('[['+review.target)&&!review.snapshot.isCurrent())throw new Error('Каталог изменился. Поставьте курсор в адрес до | и выберите заметку заново.');
   input.setCustomValidity('');return true;
  }catch(error){input.setCustomValidity(error.message);if(report)onError(error.message);return false;}
 }
 if(typeof originalCommit==='function')input.wvCommit=()=>{if(!validate())return false;close();return originalCommit();};
 listen('input',()=>{if(review&&!input.value.slice(review.open).startsWith('[['+review.target))review=null;validate(false);refresh();});
 listen('focus',()=>{snapshot=null;refresh();});listen('click',()=>refresh());listen('select',()=>{if(context()?.inAlias)close();});
 listen('compositionstart',()=>{composing=true;close();});listen('compositionend',()=>{composing=false;validate(false);refresh();});
 listen('blur',()=>{snapshot=null;close();});
 listen('change',event=>{if(!validate())event.stopImmediatePropagation();},true);
 listen('keydown',event=>{
  if(event.isComposing||event.keyCode===229||composing)return;
  const c=context();
  if((event.ctrlKey||event.metaKey)&&event.key===' '&&c?.canSuggest){event.preventDefault();event.stopImmediatePropagation();refresh(true);return;}
  if(!popup&&(event.key==='ArrowDown'||event.key==='ArrowUp')&&c?.canSuggest){event.preventDefault();event.stopImmediatePropagation();refresh();return;}
  if(popup&&(event.key==='ArrowDown'||event.key==='ArrowUp')){event.preventDefault();event.stopImmediatePropagation();active=(active+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;highlight();return;}
  if(popup&&(event.key==='Enter'||event.key==='Tab')&&items[active]){event.preventDefault();event.stopImmediatePropagation();choose(items[active].path);return;}
  if(event.key==='Escape'&&(popup||pending)){event.preventDefault();event.stopImmediatePropagation();close();return;}
  if(event.key==='Escape'&&hasPropertyWiki(input.value)&&input.value!==initial){event.preventDefault();event.stopImmediatePropagation();input.value=initial;input.setCustomValidity('');review=null;onError('');input.dispatchEvent(new Event('input',{bubbles:true}));closeNormal();close();return;}
  if(event.key==='Enter'&&!event.shiftKey&&review&&c?.complete&&(input.tagName!=='TEXTAREA'||(input.selectionStart??input.value.length)<c.to)&&typeof input.wvCommit==='function'){event.preventDefault();event.stopImmediatePropagation();input.wvCommit();}
 },true);
 return {close,destroy(){destroyed=true;close();for(const [type,handler,capture] of listeners)input.removeEventListener(type,handler,capture);input.wvCommit=originalCommit;input.setCustomValidity('');for(const [attr,value] of Object.entries(saved)){if(value===null)input.removeAttribute(attr);else input.setAttribute(attr,value);}}};
}
export function installPropertyWikiStyle(){
 if(!document.getElementById('wv-property-wiki-style')){
  const style=document.createElement('style');style.id='wv-property-wiki-style';style.textContent=`
.wv-property-wiki-menu{position:fixed;z-index:1050;overflow:auto;padding:4px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-m,6px);background:var(--background-primary);color:var(--text-normal);font:var(--font-ui-small,13px) var(--wv-ui-font,var(--font-interface,sans-serif));box-shadow:0 4px 16px var(--background-modifier-box-shadow,rgba(0,0,0,.25))}
.wv-property-wiki-option{padding:6px 8px;border-radius:var(--radius-s,4px);cursor:pointer;overflow-wrap:anywhere}.wv-property-wiki-option:hover,.wv-property-wiki-option[aria-selected=true]{background:var(--background-modifier-active-hover)}
.wv-property-wiki-name{color:var(--text-normal)}.wv-property-wiki-path{color:var(--text-muted);font-size:var(--font-ui-smaller,12px)}.wv-property-wiki-help{padding:6px 8px;border-top:1px solid var(--background-modifier-border);color:var(--text-muted);font-size:var(--font-ui-smaller,12px)}
`;document.head.appendChild(style);
 }
 window.__WV_PROPERTY_LINKS_TEST='property-links-14';
}
