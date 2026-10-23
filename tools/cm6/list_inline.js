import {StateField} from '@codemirror/state';
import {EditorView,Decoration,WidgetType} from '@codemirror/view';
import {inlineListRows,selectionTouches} from './list_inline_model.js';
export function createInlineLists({isLive,getBlocks,getHidden,onNote}){
 class InlinePart extends WidgetType{
  constructor(part,link){super();this.part=part;this.link=link;}
  eq(other){return this.part===other.part&&this.link===other.link;}
  toDOM(view){
   const part=this.part,expected=view.state.doc,node=document.createElement(this.link?'a':'span');node.className=this.link?'wv-list-inline-link':'wv-list-inline-marker';node.textContent=part.label;
   if(this.link){node.href='#';node.title=part.target;node.dataset.wvNote=part.target;}
   else{node.title='Редактировать маркер';node.setAttribute('aria-label','Редактировать маркер списка');}
   node.addEventListener('mousedown',event=>{
    if(event.button!==0)return;event.preventDefault();event.stopPropagation();
    if(this.link&&!event.altKey)return;
    if(view.state.doc!==expected||view.state.readOnly)return;
    view.dispatch({selection:{anchor:part.from+(this.link?2:0)},scrollIntoView:true});view.focus();
   });
   node.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(this.link&&!event.altKey&&view.state.doc===expected)onNote(part.target);});
   return node;
  }
  ignoreEvent(){return true;}
 }
 function build(state){
  if(!isLive(state))return Decoration.none;
  const result=[],text=state.doc.toString(),hidden=getHidden(state);
  for(const block of getBlocks(state)){
   if(hidden.some(s=>block.from>s.from&&block.from<=s.to))continue;
   const rows=inlineListRows(text,block);if(!rows)continue;
   for(const row of rows){
    for(const [part,link] of [[row,false],...row.links.map(item=>[item,true])]){
     if(!selectionTouches(state.selection.ranges,part.from,part.to))result.push(Decoration.replace({widget:new InlinePart(part,link),inclusive:false}).range(part.from,part.to));
    }
   }
  }
  return Decoration.set(result,true);
 }
 const field=StateField.define({create:build,update:(value,tr)=>tr.docChanged||tr.selection||tr.effects.length?build(tr.state):value,provide:f=>EditorView.decorations.from(f)});
 return field;
}
export function installInlineListStyle(){
 if(document.getElementById('wv-list-inline-style'))return;
 const style=document.createElement('style');style.id='wv-list-inline-style';style.textContent=`.wv-list-inline-marker{white-space:pre;color:var(--text-muted);cursor:text}.wv-list-inline-link{color:var(--text-accent,var(--interactive-accent));text-decoration:underline;cursor:pointer;overflow-wrap:anywhere}`;document.head.appendChild(style);window.__WV_LIST_INLINE_TEST='list-inline-17a';
}
