import {StateField,Prec} from '@codemirror/state';
import {EditorView,ViewPlugin,Decoration,WidgetType,GutterMarker,lineNumberWidgetMarker,keymap} from '@codemirror/view';
import {footnoteDefinitionGroups,definitionGroupActive,crossedDefinitionGroup} from './footnote_definition_group_model.js';
export function createFootnoteDefinitionGroups({isLive,getContext,getHidden,canNavigate=()=>true,message=()=>{}}){
 const all=s=>{const ctx=getContext(s);return ctx?footnoteDefinitionGroups(ctx.text,ctx.model.definitionSources):[];};
 const hidden=(s,g)=>getHidden(s).some(h=>g.from>h.from&&g.from<=h.to);
 const collapsed=s=>isLive(s)?all(s).filter(g=>!hidden(s,g)&&!definitionGroupActive(s.selection.ranges,g)):[];
 class GroupWidget extends WidgetType{
  constructor(ctx,group){super();this.ctx=ctx;this.group=group;}
  eq(other){return other instanceof GroupWidget&&other.ctx===this.ctx&&other.group.from===this.group.from&&other.group.to===this.group.to;}
  toDOM(){const b=document.createElement('button');b.type='button';b.className='wv-footnote-source-group';b.dataset.wvFootnoteGroup=String(this.group.from);b.dataset.wvFootnoteScope=this.ctx.scope;b.textContent='▸ Исходники сносок · '+this.group.definitions.length;b.title='Раскрыть весь блок определений сносок';b.setAttribute('aria-expanded','false');b.setAttribute('data-wv-view-only','true');return b;}
  ignoreEvent(){return true;}
 }
 function build(s){const ctx=getContext(s);return Decoration.set(collapsed(s).map(g=>Decoration.replace({widget:new GroupWidget(ctx,g),block:true,inclusive:false,footnoteRole:'definition-group'}).range(g.from,g.to)),true);}
 const field=StateField.define({create:build,update:(v,tr)=>tr.docChanged||tr.selection||tr.effects.length?build(tr.state):v,provide:f=>EditorView.decorations.from(f)});
 class SourceNumber extends GutterMarker{constructor(n){super();this.n=n;}eq(o){return o instanceof SourceNumber&&o.n===this.n;}toDOM(){return document.createTextNode(String(this.n));}}
 const numbers=lineNumberWidgetMarker.of((v,w)=>w instanceof GroupWidget?new SourceNumber(v.state.doc.lineAt(w.group.from).number):null);
 class Clicks{
  constructor(view){this.view=view;this.down=e=>this.handle(e,true);this.click=e=>this.handle(e,false);view.dom.addEventListener('mousedown',this.down,true);view.dom.addEventListener('click',this.click,true);if(typeof window!=='undefined')window.__WV_FOOTNOTE_GROUPS_TEST='footnote-groups-20f';}
  handle(e,down){const v=this.view,b=e.target.closest?.('button[data-wv-footnote-group]');if(!b||!isLive(v.state)||down&&e.button!==0)return;e.preventDefault();e.stopPropagation();if(down)return;if(!canNavigate()){message('Сначала завершите ввод или дождитесь окончания текущей операции.');return;}const ctx=getContext(v.state);if(!ctx||b.dataset.wvFootnoteScope!==ctx.scope)return;const g=collapsed(v.state).find(g=>String(g.from)===b.dataset.wvFootnoteGroup);if(!g)return;v.dispatch({selection:{anchor:g.from},scrollIntoView:true,userEvent:'select.pointer'});v.focus();}
  destroy(){this.view.dom.removeEventListener('mousedown',this.down,true);this.view.dom.removeEventListener('click',this.click,true);}
 }
 function arrow(v,forward,vertical){if(!isLive(v.state)||!v.hasFocus||!canNavigate())return false;const r=v.state.selection.main;if(!r.empty||v.state.selection.ranges.length!==1)return false;const gs=collapsed(v.state);if(!gs.length)return false;const next=vertical?v.moveVertically(r,forward):v.moveByChar(r,forward),g=crossedDefinitionGroup(gs,r.head,next.head,forward);if(!g)return false;const line=v.state.doc.lineAt(forward?g.from:g.to),column=r.head-v.state.doc.lineAt(r.head).from,anchor=vertical?line.from+Math.min(column,line.length):forward?g.from:g.to;v.dispatch({selection:{anchor},scrollIntoView:true,userEvent:'select'});return true;}
 const theme=EditorView.baseTheme({'.wv-footnote-source-group':{display:'block',boxSizing:'border-box',width:'100%',margin:'0',padding:'0 4px',border:'0',borderRadius:'3px',font:'inherit',lineHeight:'1.6',textAlign:'start',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:'var(--text-muted)',background:'var(--background-secondary)',cursor:'pointer'},'.wv-footnote-source-group:focus-visible':{outline:'2px solid var(--interactive-accent)',outlineOffset:'1px'}});
 return {field,extension:[Prec.high(field),numbers,theme,ViewPlugin.fromClass(Clicks),Prec.high(keymap.of([{key:'ArrowDown',run:v=>arrow(v,true,true)},{key:'ArrowUp',run:v=>arrow(v,false,true)},{key:'ArrowRight',run:v=>arrow(v,true,false)},{key:'ArrowLeft',run:v=>arrow(v,false,false)}]))]};
}
