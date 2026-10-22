import {filterPropertyValues} from './property_values.js';
let nextId = 0;
export function attachPropertySuggestions(input, field, {key, selected, getSuggestions}) {
  const id = 'wv-property-suggestions-' + (++nextId);
  input.setAttribute('role','combobox');
  input.setAttribute('aria-autocomplete','list');
  input.setAttribute('aria-expanded','false');
  const oldCommit = input.wvCommit;
  let popup=null, options=[], active=-1, pool=null, pending=null, epoch=0, observer=null, wantsFirst=false;
  let composing=false;
  function close() {
    epoch++;
    if (popup) popup.remove();
    popup=null;
    options=[];
    active=-1;
    wantsFirst=false;
    input.setAttribute('aria-expanded','false');
    input.removeAttribute('aria-controls');
    input.removeAttribute('aria-activedescendant');
    window.removeEventListener('scroll',position,true);
    window.removeEventListener('resize',position);
    window.removeEventListener('webvault:index-invalidated',invalidate);
    if (observer) observer.disconnect();
    observer=null;
  }
  function invalidate() { pool=null; close(); }
  function position() {
    if (!popup) return;
    if (!input.isConnected || document.activeElement!==input) {close();return;}
    const r=field.getBoundingClientRect();
    const width=Math.min(Math.max(r.width,220), Math.max(80,window.innerWidth-16));
    popup.style.width=width+'px';
    popup.style.left=Math.max(8,Math.min(r.left,window.innerWidth-width-8))+'px';
    const height=Math.min(240,Math.max(60,window.innerHeight-16));
    const below=window.innerHeight-r.bottom-8;
    popup.style.maxHeight=height+'px';
    if (below>=Math.min(height,popup.scrollHeight)) {
      popup.style.top=Math.max(8,r.bottom+3)+'px';
      popup.style.bottom='auto';
      popup.style.maxHeight=Math.max(40,Math.min(height,below-3))+'px';
    } else {
      popup.style.top='auto';
      popup.style.bottom=Math.max(8,window.innerHeight-r.top+3)+'px';
      popup.style.maxHeight=Math.max(40,Math.min(height,r.top-11))+'px';
    }
  }
  function mount() {
    if (popup) return;
    popup=document.createElement('div');
    popup.id=id;
    popup.className='wv-property-suggestions';
    popup.setAttribute('role','listbox');
    popup.setAttribute('aria-label','Значения свойства '+key);
    document.body.appendChild(popup);
    input.setAttribute('aria-expanded','true');
    input.setAttribute('aria-controls',id);
    window.addEventListener('scroll',position,true);
    window.addEventListener('resize',position);
    window.addEventListener('webvault:index-invalidated',invalidate);
    observer=new MutationObserver(()=>{
      if (!input.isConnected || document.activeElement!==input) close();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  function highlight() {
    if (!popup) return;
    Array.from(popup.children).forEach((el,i)=>{
      el.setAttribute('aria-selected',String(i===active));
    });
    const el=popup.children[active];
    if (el) {
      input.setAttribute('aria-activedescendant',el.id);
      if (el.offsetTop<popup.scrollTop) popup.scrollTop=el.offsetTop;
      else if(el.offsetTop+el.offsetHeight>popup.scrollTop+popup.clientHeight) popup.scrollTop=el.offsetTop+el.offsetHeight-popup.clientHeight;
    } else input.removeAttribute('aria-activedescendant');
  }
  function choose(value) {
    input.value=value;
    close();
    input.wvCommit();
  }
  function render() {
    if (document.activeElement!==input || !input.isConnected || composing) return;
    options=filterPropertyValues(pool || [],input.value,selected);
    if (!options.length) {close();return;}
    mount();
    popup.textContent='';
    active=wantsFirst?0:-1;
    wantsFirst=false;
    options.forEach((value,i)=>{
      const item=document.createElement('div');
      item.className='wv-property-suggestion';
      item.id=id+'-'+i;
      item.setAttribute('role','option');
      item.textContent=value;
      item.addEventListener('mousedown',e=>e.preventDefault());
      item.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();choose(value);});
      popup.appendChild(item);
    });
    highlight();
    position();
  }
  async function refresh() {
    if (composing || !input.isConnected || document.activeElement!==input) return;
    if (pool) {render();return;}
    const request=epoch;
    if (!pending) pending=Promise.resolve().then(()=>getSuggestions(key));
    const promise=pending;
    try {
      const result=await promise;
      if (request!==epoch || !input.isConnected || document.activeElement!==input) return;
      pool=Array.isArray(result)?result:[];
      input.removeAttribute('title');
      render();
    } catch (error) {
      if (request!==epoch || !input.isConnected) return;
      close();
      input.title='Подсказки недоступны: '+error.message;
    } finally {if(pending===promise)pending=null;}
  }
  input.wvCommit=()=>{close();return oldCommit();};
  input.addEventListener('focus',()=>{pool=null;refresh();});
  input.addEventListener('input',()=>refresh());
  input.addEventListener('compositionstart',()=>{composing=true;close();});
  input.addEventListener('compositionend',()=>{composing=false;refresh();});
  input.addEventListener('blur',()=>{pool=null;close();});
  input.addEventListener('keydown',event=>{
    if(event.isComposing || event.keyCode===229 || composing)return;
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();event.stopImmediatePropagation();
      if(popup && options.length){
        active=event.key==='ArrowDown'?(active+1)%options.length:(active<=0?options.length-1:active-1);
        highlight();
      } else {wantsFirst=true;refresh();}
    } else if((event.key==='Enter'||event.key==='Tab') && popup && active>=0){
      event.preventDefault();event.stopImmediatePropagation();choose(options[active]);
    } else if(event.key==='Escape' && (popup||pending)){
      event.preventDefault();event.stopImmediatePropagation();close();
    }
  },true);
}
export function installSuggestionStyle() {
  if(document.getElementById('wv-property-suggestions-style'))return;
  const style=document.createElement('style');
  style.id='wv-property-suggestions-style';
  style.textContent=`
.wv-property-suggestions{position:fixed;z-index:1000;overflow-y:auto;padding:4px;border:1px solid var(--background-modifier-border);border-radius:var(--radius-m,6px);background:var(--background-primary);color:var(--text-normal);font:var(--font-ui-small,14px) var(--font-interface,sans-serif);box-shadow:0 4px 16px var(--background-modifier-box-shadow,rgba(0,0,0,.25))}
.wv-property-suggestion{padding:6px 8px;border-radius:var(--radius-s,4px);overflow-wrap:anywhere;cursor:pointer}
.wv-property-suggestion:hover,.wv-property-suggestion[aria-selected=true]{background:var(--background-modifier-hover);color:var(--text-normal)}
`;
  document.head.appendChild(style);
}
