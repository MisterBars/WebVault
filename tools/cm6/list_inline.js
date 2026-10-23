import {StateField} from '@codemirror/state';
import {EditorView,Decoration,WidgetType} from '@codemirror/view';
import {inlineListRows,selectionTouches} from './list_inline_model.js';
import {makeTaskCheckbox,makeTaskTime,installTaskStyle} from './task_ui.js';
export function createInlineLists({isLive,getBlocks,getHidden,onNote}){
 class Part extends WidgetType{
  constructor(part,kind){super();this.part=part;this.kind=kind;}
  toDOM(view){
   const p=this.part,expected=view.state.doc;
   if(this.kind==='task')return makeTaskCheckbox(p,view,()=>isLive(view.state));
   if(this.kind==='stamp')return p.hide?document.createElement('span'):makeTaskTime(p.iso);
   const link=this.kind==='link',node=document.createElement(link?'a':'span');node.className=link?'wv-list-inline-link':'wv-list-inline-marker';node.textContent=p.label;
   if(link){node.href='#';node.title=p.target;node.dataset.wvNote=p.target;}else node.title='Редактировать маркер';
   node.addEventListener('mousedown',e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();if(link&&!e.altKey)return;if(view.state.doc!==expected||view.state.readOnly)return;view.dispatch({selection:{anchor:p.from+(link?2:0)},scrollIntoView:true});view.focus();});
   node.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(link&&!e.altKey&&view.state.doc===expected)onNote(p.target);});return node;
  }
  ignoreEvent(){return true;}
 }
 function build(state){
  if(!isLive(state))return Decoration.none;
  const out=[],text=state.doc.toString(),hidden=getHidden(state);
  function add(part,kind){if(!selectionTouches(state.selection.ranges,part.from,part.to))out.push(Decoration.replace({widget:new Part(part,kind),inclusive:false}).range(part.from,part.to));}
  for(const block of getBlocks(state)){
   if(hidden.some(s=>block.from>s.from&&block.from<=s.to))continue;
   for(const row of inlineListRows(text,block)||[]){add(row,'marker');for(const link of row.links)add(link,'link');if(row.task){add(row.task,'task');if(row.task.stamp&&!row.task.invalid)add({...row.task.stamp,hide:!row.task.checked},'stamp');}}
  }
  return Decoration.set(out,true);
 }
 return StateField.define({create:build,update:(v,tr)=>tr.docChanged||tr.selection||tr.effects.length?build(tr.state):v,provide:f=>EditorView.decorations.from(f)});
}
export function installInlineListStyle(){
 installTaskStyle();if(document.getElementById('wv-list-inline-style'))return;
 const s=document.createElement('style');s.id='wv-list-inline-style';s.textContent='.wv-list-inline-marker{white-space:pre;color:var(--text-muted);cursor:text}.wv-list-inline-link{color:var(--text-accent,var(--interactive-accent));text-decoration:underline;cursor:pointer;overflow-wrap:anywhere}';document.head.appendChild(s);window.__WV_LIST_INLINE_TEST='list-inline-17b';
}
