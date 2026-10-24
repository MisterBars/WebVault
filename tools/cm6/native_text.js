import {StateField} from '@codemirror/state';
import {EditorView,Decoration,WidgetType} from '@codemirror/view';
import {syntaxTree} from '@codemirror/language';
import {parseDocument} from './markdown_renderer.js';
import {isNativeTextBlock,markerVisible,markerScope,nativeHeadingBody,decodeEntity} from './native_text_model.js';
export {isNativeTextBlock,nativeHeadingBody} from './native_text_model.js';
export function createNativeText({isLive,getBlocks,getHidden,getSections=()=>[],onToggle=null}){
 const classes={StrongEmphasis:'wv-native-strong',Emphasis:'wv-native-em',Strikethrough:'wv-native-strike',WVStrike:'wv-native-strike',InlineCode:'wv-native-code',WVHighlight:'wv-native-highlight'};
 const markers=new Set(['EmphasisMark','StrikethroughMark','WVStrikeMark','CodeMark','CodeInfo','WVHighlightMark','HeaderMark']);
 const scopes=new Set([...Object.keys(classes),'FencedCode',...Array.from({length:6},(_,i)=>'ATXHeading'+(i+1)),'SetextHeading1','SetextHeading2']);
 class Entity extends WidgetType{
  constructor(raw,value){super();this.raw=raw;this.value=value;}
  eq(other){return other instanceof Entity&&this.raw===other.raw&&this.value===other.value;}
  toDOM(){const span=document.createElement('span');span.className='wv-native-entity';span.textContent=this.value;span.title='Редактировать '+this.raw;return span;}
  ignoreEvent(){return false;}
 }
 class HeadingControl extends WidgetType{
  constructor(section,folded,doc,disabled){super();this.section=section;this.folded=folded;this.doc=doc;this.disabled=disabled;}
  eq(other){return other instanceof HeadingControl&&this.doc===other.doc&&this.section.from===other.section.from&&this.section.to===other.section.to&&this.section.label===other.section.label&&this.folded===other.folded&&this.disabled===other.disabled;}
  toDOM(editor){
   const anchor=document.createElement('span');anchor.className='wv-native-heading-anchor';anchor.contentEditable='false';
   const button=document.createElement('button');button.type='button';button.className='wv-native-heading-button';button.disabled=this.disabled;button.dataset.wvHeadingFold=String(this.section.from);button.setAttribute('data-wv-view-only','true');button.setAttribute('aria-expanded',String(!this.folded));button.title=(this.folded?'Развернуть':'Свернуть')+' раздел: '+this.section.label;button.setAttribute('aria-label',button.title);
   const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');const path=document.createElementNS(ns,'path');path.setAttribute('d','M6 9l6 6 6-6');svg.appendChild(path);button.appendChild(svg);
   button.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();});button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!button.disabled&&editor.state.doc===this.doc)onToggle(this.section.from,this.doc);});anchor.appendChild(button);return anchor;
  }
  ignoreEvent(){return true;}
 }
 function build(state){
  if(!isLive(state))return Decoration.none;
  const hidden=getHidden(state),sections=getSections(state),blocks=getBlocks(state).filter(b=>isNativeTextBlock(b)&&!hidden.some(s=>b.from>s.from&&b.from<=s.to)),out=[];
  const allowed=(from,to)=>blocks.some(b=>from>=b.from&&to<=b.to);
  syntaxTree(state).iterate({enter(node){
   if(!allowed(node.from,node.to))return;
   const cls=classes[node.name];if(cls&&node.to>node.from)out.push(Decoration.mark({class:cls}).range(node.from,node.to));
   if(markers.has(node.name)&&node.to>node.from){const scope=markerScope(node.node,scopes);if(!markerVisible(state.selection.ranges,scope.from,scope.to))out.push(Decoration.replace({inclusive:false}).range(node.from,node.to));}
   if((node.name==='Escape'||node.name==='HardBreak')&&!markerVisible(state.selection.ranges,node.from,node.to)&&state.doc.sliceString(node.from,node.from+1)==='\\')out.push(Decoration.replace({inclusive:false}).range(node.from,node.from+1));
   if(node.name==='Entity'&&!markerVisible(state.selection.ranges,node.from,node.to)){const raw=state.doc.sliceString(node.from,node.to),value=decodeEntity(raw,parseDocument);if(value!==null)out.push(Decoration.replace({widget:new Entity(raw,value),inclusive:false}).range(node.from,node.to));}
  }});
  for(const b of blocks){
   if(['fence','code_block'].includes(b.tokens[0].type))for(let n=state.doc.lineAt(b.from).number,last=state.doc.lineAt(b.to).number;n<=last;n++)out.push(Decoration.line({class:'wv-native-code-line'}).range(state.doc.line(n).from));
   if(b.tokens[0].type==='heading_open'){
    out.push(Decoration.line({class:'wv-native-heading-line'}).range(state.doc.lineAt(b.from).from));
    const section=sections.find(s=>s.from===b.from),closed=hidden.find(s=>s.from===b.from);
    if(section?.hasBody&&onToggle)out.push(Decoration.widget({widget:new HeadingControl(section,!!closed,state.doc,state.readOnly),side:-1}).range(b.from));
    const body=nativeHeadingBody(b,closed);if(body)out.push(Decoration.replace({block:true,inclusive:false}).range(body.from,body.to));
   }
  }
  return Decoration.set(out,true);
 }
 const field=StateField.define({create:build,update:(value,tr)=>tr.docChanged||tr.selection||tr.effects.length?build(tr.state):value,provide:f=>EditorView.decorations.from(f)});
 const style=EditorView.baseTheme({'.wv-native-entity':{whiteSpace:'pre'},'.wv-native-strong':{fontWeight:'bold'},'.wv-native-em':{fontStyle:'italic'},'.wv-native-strike':{textDecoration:'line-through'},'.wv-native-code':{fontFamily:'var(--font-monospace,monospace)',backgroundColor:'var(--background-secondary)'},'.wv-native-highlight':{backgroundColor:'var(--text-highlight-bg,#7b682d)',color:'inherit'},'.wv-native-code-line':{fontFamily:'var(--font-monospace,monospace)',backgroundColor:'var(--background-secondary)'},'.wv-native-heading-line':{position:'relative'},'.wv-native-heading-anchor':{position:'relative',display:'inline-block',width:'0',verticalAlign:'middle'},'.wv-native-heading-button':{position:'absolute',left:'var(--wv-heading-fold-offset,-24px)',top:'50%',transform:'translateY(-50%)',display:'inline-flex',alignItems:'center',justifyContent:'center',width:'20px',height:'20px',minHeight:'0',padding:'0',margin:'0',border:'0',borderRadius:'var(--radius-s,4px)',background:'transparent',color:'var(--text-muted)',cursor:'pointer'},'.wv-native-heading-button:hover':{background:'var(--background-modifier-hover)',color:'var(--text-normal)'},'.wv-native-heading-button:focus-visible':{outline:'2px solid var(--interactive-accent)',outlineOffset:'1px'},'.wv-native-heading-button:disabled':{opacity:'0.5',cursor:'default'},'.wv-native-heading-button svg':{width:'16px',height:'16px',fill:'none',stroke:'currentColor',strokeWidth:'1.8',strokeLinecap:'round',strokeLinejoin:'round'},'.wv-native-heading-button[aria-expanded=false] svg':{transform:'rotate(-90deg)'}});
 if(typeof window!=='undefined'){window.__WV_NATIVE_TEXT_REVEAL_TEST='native-reveal-19e';window.__WV_NATIVE_HEADINGS_TEST='native-headings-19f';window.__WV_NATIVE_LITERALS_TEST='native-literals-19h';}
 return {field,extension:[field,style]};
}
