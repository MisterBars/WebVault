import './transfer.js';
export function installModeSlider(change){
const actions=document.querySelector('#notesPane .view-actions');
const style=document.createElement('style');style.textContent=`
.wv-modes{position:relative;display:grid;grid-template-columns:42px minmax(0,1fr) 42px;gap:4px;padding:4px;width:360px;max-width:100%;box-sizing:border-box;border:1px solid var(--background-modifier-border);border-radius:18px;background:var(--background-secondary);isolation:isolate}
.wv-modes[data-mode="0"]{grid-template-columns:minmax(0,1fr) 42px 42px}.wv-modes[data-mode="2"]{grid-template-columns:42px 42px minmax(0,1fr)}
.wv-mode-pill{position:absolute;z-index:-1;left:4px;top:4px;bottom:4px;width:calc(100% - 100px);border-radius:13px;background:var(--interactive-accent);transform:translateX(46px);transition:transform 220ms ease}
.wv-modes[data-mode="0"] .wv-mode-pill{transform:translateX(0)}.wv-modes[data-mode="2"] .wv-mode-pill{transform:translateX(92px)}
.wv-modes button{display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;height:30px;margin:0;padding:0 5px;border:0;box-shadow:none;background:transparent;color:var(--text-muted);font:inherit;cursor:pointer}
.wv-modes button[aria-checked=true]{color:var(--text-on-accent,#fff)}.wv-mode-label{display:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.wv-modes button[aria-checked=true] .wv-mode-label{display:inline}.wv-mode-icon{flex:none;font-size:16px}.wv-modes button:focus-visible{outline:2px solid var(--text-normal);outline-offset:-2px;border-radius:12px}
#markdownToggle{display:none!important}
@media(prefers-reduced-motion:reduce){.wv-mode-pill{transition:none}}
`;document.head.appendChild(style);
const root=document.createElement('div');root.className='wv-modes';root.dataset.mode='1';root.setAttribute('role','radiogroup');root.setAttribute('aria-label','Режим заметки');const pill=document.createElement('span');pill.className='wv-mode-pill';pill.setAttribute('aria-hidden','true');root.appendChild(pill);
const names=['Исходный код','Динамический просмотр','Просмотр'],icons=['〈〉','✎','◉'],buttons=[];let active=1;
function paint(){root.dataset.mode=String(active);buttons.forEach((b,i)=>{b.setAttribute('aria-checked',String(i===active));b.tabIndex=i===active?0:-1;});}
function choose(i,focus){if(i<0||i>2||change(i)===false)return;active=i;paint();if(focus)buttons[i].focus();}
names.forEach((name,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('role','radio');b.setAttribute('aria-label',name);b.title=name;const icon=document.createElement('span');icon.className='wv-mode-icon';icon.textContent=icons[i];icon.setAttribute('aria-hidden','true');const text=document.createElement('span');text.className='wv-mode-label';text.textContent=name;b.append(icon,text);b.addEventListener('click',()=>choose(i,false));b.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight'||e.key==='ArrowDown')next=(active+1)%3;if(e.key==='ArrowLeft'||e.key==='ArrowUp')next=(active+2)%3;if(e.key==='Home')next=0;if(e.key==='End')next=2;if(next!==undefined){e.preventDefault();e.stopPropagation();choose(next,true);}});buttons.push(b);root.appendChild(b);});actions.appendChild(root);paint();return {choose,get mode(){return active;}};
}
