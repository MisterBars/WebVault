export function historyButtonState(direction,status){
 const undo=direction==='undo';
 const label=undo?'Отменить':'Повторить';
 const shortcut=undo?'Ctrl+Z':'Ctrl+Y / Ctrl+Shift+Z';
 const available=undo?status.canUndo:status.canRedo;
 const depth=undo?status.undoDepth:status.redoDepth;
 let title=label+' последнее изменение заметки ('+shortcut+')';
 if(!status.writable)title+=' — сейчас недоступно';
 else if(status.blockedByDraft)title+=' — сначала подтвердите или отмените ввод/диалог свойств';
 else if(!depth)title+=' — нет изменений для '+(undo?'отмены':'повтора');
 else title+='; шагов: '+depth;
 return {label,title,disabled:!available,ariaKeyShortcuts:undo?'Control+Z Meta+Z':'Control+Y Control+Shift+Z Meta+Shift+Z'};
}
function arrow(direction){
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.classList.add('wv-note-history-icon');
 const path=document.createElementNS(ns,'path');
 path.setAttribute('d',direction==='undo'?'M8 4 3 9l5 5 M3 9h9a7 7 0 0 1 7 7v2':'M16 4l5 5-5 5 M21 9h-9a7 7 0 0 0-7 7v2');
 svg.appendChild(path);return svg;
}
export function appendNoteHistoryButtons(parent,controller){
 const actions=document.createElement('div');actions.className='wv-note-history-actions wv-property-history-actions';actions.setAttribute('role','group');actions.setAttribute('aria-label','История изменений заметки');
 for(const direction of ['undo','redo']){
  const button=document.createElement('button');button.type='button';button.className='wv-property-history-button wv-note-history-button';button.dataset.wvHistory=direction;button.wvHistoryController=controller;
  const state=historyButtonState(direction,controller.status());
  button.disabled=state.disabled;button.title=state.title;button.setAttribute('aria-label',state.label+' изменение заметки');button.setAttribute('aria-keyshortcuts',state.ariaKeyShortcuts);
  const text=document.createElement('span');text.className='wv-note-history-label';text.textContent=state.label;button.append(arrow(direction),text);
  button.addEventListener('mousedown',event=>event.preventDefault());
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();controller[direction]();});actions.appendChild(button);
 }
 parent.prepend(actions);installNoteHistoryStyle();return actions;
}
export function installNoteHistoryStyle(){
 if(document.getElementById('wv-note-history-style'))return;
 const style=document.createElement('style');style.id='wv-note-history-style';
 style.textContent=`
.wv-properties-v2 .wv-property-header{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.wv-properties-v2 .wv-property-header h3{margin:0}
.wv-note-history-actions{display:inline-flex;align-items:center;gap:4px;flex:none}
.wv-note-history-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:auto;height:30px;min-height:30px;min-width:32px;margin:0;padding:4px 8px;border:1px solid var(--background-modifier-border);border-radius:var(--input-radius,4px);background:var(--interactive-normal);color:var(--text-normal);font:inherit;font-size:var(--font-ui-small,14px);line-height:1.2;white-space:nowrap}
.wv-note-history-button:hover:not(:disabled){background:var(--interactive-hover);border-color:var(--background-modifier-border-hover,var(--background-modifier-border))}
.wv-note-history-button:focus-visible{outline:2px solid var(--interactive-accent);outline-offset:2px}
.wv-note-history-button:disabled{opacity:.4;cursor:default;color:var(--text-muted)}
.wv-note-history-button .wv-note-history-icon{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
@media(max-width:760px){.wv-note-history-label{display:none}.wv-note-history-button{padding:4px 6px}}
`;
 document.head.appendChild(style);
}
