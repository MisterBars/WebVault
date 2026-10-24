export function dynamicFootnoteTarget(ctx,id){if(!ctx||!/^wv-footnote-\d+$/.test(ctx.scope)||typeof id!=='string'||!id.startsWith(ctx.scope+'-'))return null;const value=id.slice(ctx.scope.length+1),m=/^(note|ref)-(\d+)(?:-(\d+))?$/.exec(value);if(!m||m[1]==='note'&&m[3]||m[1]==='ref'&&!m[3])return null;const number=Number(m[2]),occurrence=Number(m[3]);if(!Number.isSafeInteger(number)||number<1||m[1]==='ref'&&(!Number.isSafeInteger(occurrence)||occurrence<1))return null;const note=ctx.model.notes.find(n=>n.number===number);if(!note)return null;const ref=m[1]==='ref'?note.references.find(r=>r.occurrence===occurrence):null;return m[1]==='ref'&&!ref?null:{kind:m[1],note,ref};}
export function footnoteEditPosition(ctx,number){const note=ctx?.model.notes.find(n=>n.number===number);if(!note)return null;return note.definition?ctx.model.definitionSources.find(d=>d.from===note.definition.from)?.bodyFrom??note.definition.from:note.references[0]?.from+2;}
import {StateField} from '@codemirror/state';
import {EditorView,Decoration,WidgetType,ViewPlugin,GutterMarker,lineNumberWidgetMarker} from '@codemirror/view';
import {isNativeTextBlock,markerVisible} from './native_text_model.js';
import {inlineListRows} from './list_inline_model.js';
import {makeFootnoteReference,appendFootnoteList} from './footnote_reading.js';
import {groupFootnotesBySection,flashFootnoteTarget} from './footnote_sections.js';
function installStyle(){if(document.getElementById('wv-footnote-dynamic-style'))return;const s=document.createElement('style');s.id='wv-footnote-dynamic-style';s.textContent='.wv-footnotes>ol>li>p:last-of-type{display:inline;margin-bottom:0}.wv-footnote-backlinks{display:inline-flex;gap:0.4em;margin-inline-start:0.5em;white-space:nowrap}.wv-footnote-backlinks a{margin-inline-start:0}.wv-footnote-edit{font:inherit;font-size:0.85em;padding:0;border:0;background:transparent;color:var(--text-muted);cursor:pointer}.wv-footnote-edit:disabled{opacity:0.5;cursor:default}';document.head.appendChild(s);}
export function createDynamicFootnotes(options){
 const {isLive,getBlocks,getSections,getHidden,renderTokens,parseFragment,onNote,onToggle,canNavigate=()=>true,canEdit=()=>true,message=()=>{}}=options;
 class Reference extends WidgetType{constructor(ctx,ref){super();this.ctx=ctx;this.ref=ref;}eq(other){return other instanceof Reference&&other.ctx===this.ctx&&other.ref.from===this.ref.from;}toDOM(){return makeFootnoteReference({scope:this.ctx.scope,number:this.ref.number,occurrence:this.ref.occurrence},this.ctx.text.slice(this.ref.from,this.ref.to));}ignoreEvent(){return false;}}
 class Footer extends WidgetType{
  constructor(ctx,group,disabled){super();this.ctx=ctx;this.group=group;this.disabled=disabled;}
  eq(other){return other instanceof Footer&&this.ctx===other.ctx&&this.group.end===other.group.end&&this.group.section?.from===other.group.section?.from&&this.disabled===other.disabled;}
  toDOM(){const root=renderTokens([],onNote);root.classList.add('wv-dynamic-footnotes');root.contentEditable='false';appendFootnoteList(root,this.ctx,onNote,renderTokens,parseFragment,{notes:this.group.notes,includeUnused:false});for(const note of this.group.notes){const li=root.querySelector('#'+this.ctx.scope+'-note-'+note.number);if(!li)continue;const button=document.createElement('button');button.type='button';button.className='wv-footnote-edit';button.textContent='Исходник';button.title='Редактировать исходную запись сноски';button.disabled=this.disabled;button.dataset.wvFootnoteEdit=String(note.number);button.dataset.wvFootnoteScope=this.ctx.scope;button.setAttribute('data-wv-view-only','true');(li.querySelector('.wv-footnote-backlinks')||li).appendChild(button);}return root;}
  ignoreEvent(){return true;}
 }
 function build(state){
  if(!isLive(state))return Decoration.none;const blocks=getBlocks(state),ctx=blocks.footnotes;if(!ctx)return Decoration.none;const out=[],hidden=getHidden(state),inside=pos=>hidden.some(s=>pos>s.from&&pos<=s.to);
  for(const ref of ctx.model.references){if(ref.status!=='resolved'||inside(ref.from)||markerVisible(state.selection.ranges,ref.from,ref.to))continue;const host=blocks.find(b=>ref.from>=b.from&&ref.to<=b.to);if(host&&(isNativeTextBlock(host)||inlineListRows(ctx.text,host)))out.push(Decoration.replace({widget:new Reference(ctx,ref),inclusive:false,footnoteRole:'reference'}).range(ref.from,ref.to));}
  const used=new Set(ctx.model.notes.filter(n=>n.definition).map(n=>n.definition.from));for(const d of ctx.model.definitionSources)if(used.has(d.from)&&!inside(d.from)&&!markerVisible(state.selection.ranges,d.from,d.to))out.push(Decoration.replace({block:true,inclusive:false,footnoteRole:'definition'}).range(d.from,d.to));
  let side=100;for(const group of groupFootnotesBySection(ctx.model.notes,getSections(state),state.doc.length)){if(group.section&&hidden.some(s=>group.section.from>=s.from&&group.section.from<=s.to))continue;out.push(Decoration.widget({widget:new Footer(ctx,group,state.readOnly),block:true,side:side++,footnoteRole:'list'}).range(group.end));}
  return Decoration.set(out,true);
 }
 const field=StateField.define({create:build,update:(value,tr)=>tr.docChanged||tr.selection||tr.effects.length?build(tr.state):value,provide:f=>EditorView.decorations.from(f)});
 class EmptyNumber extends GutterMarker{toDOM(){return document.createTextNode('');}}
 const empty=new EmptyNumber(),numbers=lineNumberWidgetMarker.of((view,widget)=>widget instanceof Footer?empty:null);
 class Navigation{
  constructor(view){this.view=view;this.dead=false;this.serial=0;this.frame=0;installStyle();this.down=e=>this.handle(e,true);this.click=e=>this.handle(e,false);view.dom.addEventListener('mousedown',this.down,true);view.dom.addEventListener('click',this.click,true);if(typeof window!=='undefined')window.__WV_FOOTNOTES_DYNAMIC_TEST='footnotes-dynamic-20e';}
  update(u){if(u.docChanged||!isLive(u.state))this.serial++;}
  handle(event,down){
   if(!isLive(this.view.state))return;const a=event.target.closest?.('a[data-wv-footnote-target]'),button=event.target.closest?.('button[data-wv-footnote-edit]');if(!a&&!button)return;if(a&&event.altKey){if(!down)event.preventDefault();return;}if(down&&event.button!==0)return;event.preventDefault();event.stopPropagation();if(down)return;
   const ctx=getBlocks(this.view.state).footnotes;if(!ctx||!canNavigate()||button&&(!canEdit()||this.view.state.readOnly)){message('Сначала завершите ввод или дождитесь окончания текущей операции.');return;}
   if(button){if(button.dataset.wvFootnoteScope!==ctx.scope)return;const pos=footnoteEditPosition(ctx,Number(button.dataset.wvFootnoteEdit));if(Number.isInteger(pos))this.jump(ctx,pos,null,true);return;}
   const target=dynamicFootnoteTarget(ctx,a.dataset.wvFootnoteTarget);if(!target)return;const group=target.kind==='note'?groupFootnotesBySection(ctx.model.notes,getSections(this.view.state),this.view.state.doc.length).find(g=>g.notes.includes(target.note)):null;const pos=group?group.end:target.ref?.from;if(Number.isInteger(pos))this.jump(ctx,pos,a.dataset.wvFootnoteTarget,false,target.kind==='ref');
  }
  jump(ctx,pos,id,edit,allowSource=false){
   const view=this.view,doc=view.state.doc,serial=++this.serial;let selection=null;const valid=()=>!this.dead&&this.serial===serial&&view.state.doc===doc&&getBlocks(view.state).footnotes===ctx&&isLive(view.state)&&canNavigate()&&(!selection||view.state.selection===selection);
   for(let i=0;i<12;i++){const closed=getHidden(view.state).find(s=>pos>=s.from&&pos<=s.to);if(!closed)break;if(!onToggle||!onToggle(closed.from,doc)||!valid())return;}
   if(!valid()||getHidden(view.state).some(s=>pos>=s.from&&pos<=s.to))return;
   view.dispatch({...edit?{selection:{anchor:pos}}:{},effects:EditorView.scrollIntoView(pos,{y:'center'})});if(edit)view.focus();selection=view.state.selection;
   const measure=tries=>{if(!valid())return;view.requestMeasure({read:()=>{if(!valid())return null;const target=id?view.dom.querySelector('#'+id):null;if(target)return target;if(!id||allowSource&&tries===0){try{const node=view.domAtPos(pos).node,element=node.nodeType===1?node:node.parentElement;return element?.closest('.cm-line')||null;}catch{return null;}}return null;},write:target=>{if(!valid())return;if(target){target.scrollIntoView({block:'center'});if(id&&target.id)target.focus({preventScroll:true});if(edit)view.focus();flashFootnoteTarget(view.dom,target);}else if(tries)this.frame=requestAnimationFrame(()=>measure(tries-1));else message('Цель пока не отображается. Повторите переход после обновления редактора.');}});};measure(3);
  }
  destroy(){this.dead=true;this.serial++;if(this.frame)cancelAnimationFrame(this.frame);this.view.dom.removeEventListener('mousedown',this.down,true);this.view.dom.removeEventListener('click',this.click,true);}
 }
 return {field,extension:[field,numbers,ViewPlugin.fromClass(Navigation)]};
}
