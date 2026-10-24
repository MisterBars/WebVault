import {widgetSourceNumber} from './source_widget_number.js';
import {createNativeText,isNativeTextBlock,nativeHeadingBody} from './native_text.js';
import {revealAtPoint} from './widget_click.js';
import {paragraphRows,ensureBreakTails} from './paragraph_preview.js';
import {createEditableTable,installTableStyle,finishTableDraft,hasTableDraft} from './table_ui.js';
import {createTableCompletion} from './table_completion.js';
import {inlineListRows} from './list_inline_model.js';
import {createInlineLists,installInlineListStyle} from './list_inline.js';
import {closeCompletion} from '@codemirror/autocomplete';
import {createWikiCompletions,installWikiCompletionStyle} from './wiki_completion.js';
import {createResolver} from './note_resolver.js';
import {noteAppearance,installNoteAppearance} from './note_theme.js';
import {createHeadingFolds} from './heading_fold_state.js';
import {attachHeadingFold,renderHeadingReading,installHeadingFoldStyle} from './heading_fold_ui.js';
import {createSourceMarkdown} from './source_markdown.js';
import {windowGutters} from './source_gutter_view.js';
import {installPropertyHistory,commitPropertyChange} from './property_history.js';
import {propertyCandidates} from './property_values.js';
import {basicSetup} from 'codemirror';
import {EditorState,Compartment,StateField,StateEffect,Transaction} from '@codemirror/state';
import {EditorView,Decoration,WidgetType,GutterMarker,lineNumberWidgetMarker} from '@codemirror/view';
import {installModeSlider} from './mode_slider.js';
import {parseDocument,renderTokens as renderRawTokens,renderDocument,installMarkdownStyle} from './markdown_renderer.js';
const renderTokens=(tokens,onNote)=>ensureBreakTails(renderRawTokens(tokens,onNote));
import {getNoteIndex,resolveIndexed,installIndexHooks} from './note_index.js';
import {installGraph} from './graph_view.js';
import {findFrontmatter,inspectProperties,createPropertiesPanel,installPropertiesStyle} from './properties.js';
import {installTrashRibbon} from './trash_ribbon.js';
const app=window.WebVaultCore,area=document.getElementById('editor');if(!area||!app)throw new Error('WebVault editor not ready');installMarkdownStyle();installPropertiesStyle();installHeadingFoldStyle();installNoteAppearance();installWikiCompletionStyle();installInlineListStyle();installTableStyle();
const nativeValue=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value'),nativeDisabled=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'disabled'),nativeReadOnly=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'readOnly'),nativeHidden=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'hidden');
const host=document.createElement('div'),reading=document.createElement('section');reading.className='wv-reading-pane';reading.hidden=true;reading.setAttribute('aria-label','Просмотр Markdown');area.parentNode.insertBefore(host,area);area.parentNode.insertBefore(reading,area);host.hidden=area.hidden;const access=new Compartment(),modeEffect=StateEffect.define();let currentMode=1,view,historyBridge=null;
const wikiLinks=createWikiCompletions(()=>({userId:app.state.user&&app.state.user.id,path:app.state.note||'',mode:currentMode,canWrite:!!app.state.user&&!app.state.user.isAdmin&&!app.state.user.mustChangePassword&&app.state.hasVault&&!!app.state.note&&!area.disabled&&!area.readOnly&&currentMode!==2&&!(document.activeElement&&document.activeElement.closest('.wv-properties'))&&!(historyBridge&&historyBridge.forCurrentNote().status().blockedByDraft)}),()=>app);
const tableCompletion=createTableCompletion(()=>({userId:app.state.user&&app.state.user.id,path:app.state.note||'',mode:currentMode,canWrite:!!app.state.user&&!app.state.user.isAdmin&&!app.state.user.mustChangePassword&&app.state.hasVault&&!!app.state.note&&!area.disabled&&!area.readOnly&&!app.isBusy()&&currentMode!==2&&!hasTableDraft()&&!(historyBridge&&historyBridge.forCurrentNote().status().blockedByDraft)}),text=>app.message(text));
if(typeof window!=='undefined')window.WebVaultLinks={status:()=>wikiLinks.catalog.status(),refreshCatalog:()=>wikiLinks.catalog.ensure({refresh:true}).then(()=>wikiLinks.catalog.status())};

function propertyLinkSuggestions({refresh=false}={}){
 const user=app.state.user,path=app.state.note,mode=currentMode,expected=view&&view.state.doc;
 if(!user||user.isAdmin||user.mustChangePassword||!app.state.hasVault||!path||!expected||area.disabled||area.readOnly||mode===0)return Promise.reject(new Error('Редактор свойств недоступен.'));
 const id=user.id;closeCompletion(view);
 return wikiLinks.catalog.ensure({refresh}).then(snapshot=>{
  const valid=()=>!!app.state.user&&app.state.user.id===id&&!app.state.user.isAdmin&&!app.state.user.mustChangePassword&&app.state.note===path&&currentMode===mode&&view.state.doc===expected&&!area.disabled&&!area.readOnly&&wikiLinks.catalog.isCurrent(snapshot);
  if(!valid())throw new Error('Сессия, заметка или каталог изменились.');
  return {paths:snapshot.paths,sourcePath:path,isCurrent:valid};
 });
}
function propertyNameSuggestions(){
  const user=app.state.user,path=app.state.note,mode=currentMode;
  if(!user||user.isAdmin||user.mustChangePassword||!app.state.hasVault)return Promise.reject(new Error('Нужно личное хранилище.'));
  const id=user.id;
  return getNoteIndex().then(index=>{
    if(!app.state.user||app.state.user.id!==id||app.state.user.isAdmin||app.state.user.mustChangePassword||!app.state.hasVault||app.state.note!==path||currentMode!==mode||index.userId!==id)throw new Error('Сессия или заметка изменилась.');
    return index.notes.flatMap(note=>note.propertyNames||[]);
  });
}
function propertySuggestions(key){
  const user=app.state.user,path=app.state.note,mode=currentMode;
  if(!user||user.isAdmin||user.mustChangePassword||!app.state.hasVault)return Promise.reject(new Error('Нужно личное хранилище.'));
  const id=user.id;
  return getNoteIndex().then(index=>{
    if(!app.state.user||app.state.user.id!==id||app.state.user.isAdmin||app.state.user.mustChangePassword||!app.state.hasVault||app.state.note!==path||currentMode!==mode||index.userId!==id)throw new Error('Сессия или заметка изменилась.');
    return propertyCandidates(index.notes,key,path);
  });
}
function openNote(target){
 if(!finishTableDraft())return;
 if(!app.state.user||app.state.user.isAdmin||app.state.user.mustChangePassword||app.isBusy())return;
 if(historyBridge&&historyBridge.forCurrentNote().status().blockedByDraft){app.message('Сначала подтвердите ввод или завершите/отмените диалог свойств.');return;}
 const user=app.state.user.id,source=app.state.note||'',old=area.readOnly;area.readOnly=true;
 app.run(async()=>{try{
  if(app.state.dirty)await app.saveNote();
  if(!app.state.user||app.state.user.id!==user||app.state.dirty)throw new Error('Переход отменён: заметка не сохранена или сессия изменилась.');
  const catalog=await wikiLinks.catalog.ensure(),r=createResolver(catalog.paths)(source,target);
  if(!app.state.user||app.state.user.id!==user||app.state.note!==source)throw new Error('Переход отменён: заметка или сессия изменились.');
  if(r.status!=='resolved')throw new Error(r.status==='ambiguous'?'Неоднозначная ссылка: '+r.candidates.join('; '):'Заметка не найдена или ссылка не поддерживается: '+target);
  if(r.path!==app.state.note)await app.openNote(r.path);
  if(r.fragment)app.message('Заметка открыта. Переход к заголовку/блоку пока не реализован.');
 }finally{area.readOnly=old;}});
}

const live=StateField.define({create:()=>currentMode===1,update:(v,tr)=>{for(const e of tr.effects)if(e.is(modeEffect))v=e.value;return v;}});
function blocks(state){const text=state.doc.toString(),data=parseDocument(text);const result=data.blocks.map(b=>({from:state.doc.line(b.map[0]+1).from,to:state.doc.line(Math.min(b.map[1],state.doc.lines)).to,tokens:b.tokens,properties:b.tokens[0].type==='wv_properties',table:b.tokens[0].type==='table_open'})).filter(b=>b.to>b.from);if(!findFrontmatter(text))result.unshift({from:0,to:0,tokens:[],properties:true,synthetic:true});return result;}
const parsed=StateField.define({create:blocks,update:(v,tr)=>tr.docChanged?blocks(tr.state):v});
const headingFolds=createHeadingFolds({getBlocks:state=>state.field(parsed),isLive:state=>state.field(live)});
function toggleHeading(from,expectedDoc,editing=false){
 if(!finishTableDraft())return false;
 if(currentMode===0||!app.state.user||app.state.user.isAdmin||app.state.user.mustChangePassword||!app.state.note||area.disabled||area.readOnly||app.isBusy())return false;
 if(historyBridge&&historyBridge.forCurrentNote().status().blockedByDraft){app.message('Сначала подтвердите ввод или завершите/отмените диалог свойств.');return false;}
 const ok=headingFolds.toggle(view,from,expectedDoc,editing);
 if(ok&&!editing)queueMicrotask(()=>{
  if(view.state.doc!==expectedDoc)return;
  const root=currentMode===2?reading:view.dom;
  const control=Array.from(root.querySelectorAll('[data-wv-heading-fold]')).find(n=>n.dataset.wvHeadingFold===String(from));
  if(control)control.focus({preventScroll:true});
 });
 return ok;
}

const inlineLists=createInlineLists({isLive:state=>state.field(live),getBlocks:state=>state.field(parsed),getHidden:state=>headingFolds.visible(state),onNote:openNote});
const nativeText=createNativeText({isLive:state=>state.field(live),getBlocks:state=>state.field(parsed),getHidden:state=>headingFolds.visible(state),getSections:state=>headingFolds.sections(state),onToggle:(from,doc)=>toggleHeading(from,doc)});
class PropertiesWidget extends WidgetType{constructor(block){super();this.block=block;}eq(other){return this.block===other.block;}toDOM(editor){const expected=editor.state.doc,user=app.state.user&&app.state.user.id,path=app.state.note;return createPropertiesPanel(expected.toString(),{readOnly:false,onNote:openNote,getSuggestions:propertySuggestions,getNameSuggestions:propertyNameSuggestions,getLinkSuggestions:propertyLinkSuggestions,history:historyBridge&&historyBridge.forCurrentNote(),onCommit:change=>{if(currentMode!==1||area.disabled||area.readOnly||app.isBusy()||!app.state.user||app.state.user.id!==user||app.state.note!==path||editor.state.doc!==expected)throw new Error('Свойства изменились или редактор занят. Повторите действие.');commitPropertyChange(editor,change);},restoreFocus:key=>{const control=Array.from(editor.dom.querySelectorAll('[data-wv-property]')).find(n=>n.dataset.wvProperty===key&&!n.disabled);if(control)control.focus();}});}ignoreEvent(){return true;}}
class BlockWidget extends WidgetType{
 constructor(block,section=null,folded=false){super();this.block=block;this.section=section;this.folded=folded;}
 eq(other){return other instanceof BlockWidget&&this.block===other.block&&this.folded===other.folded&&(this.section?this.section.to:0)===(other.section?other.section.to:0);}
 toDOM(editor){
  const expected=editor.state.doc;
  if(this.block.table){const user=app.state.user&&app.state.user.id,path=app.state.note;return createEditableTable(this.block,editor,{renderTokens,onNote:openNote,canWrite:()=>currentMode===1&&!area.disabled&&!area.readOnly&&!app.isBusy()&&!!app.state.user&&app.state.user.id===user&&!app.state.user.isAdmin&&!app.state.user.mustChangePassword&&app.state.hasVault&&app.state.note===path&&editor.state.doc===expected,canStart:()=>!(historyBridge&&historyBridge.forCurrentNote().status().blockedByDraft),onSave:()=>app.run(()=>app.saveNote()),message:text=>app.message(text)});}
  const dom=renderTokens(this.block.tokens,openNote);dom.contentEditable='false';
  dom.addEventListener('click',event=>{if(event.altKey&&event.target.closest('a')){event.preventDefault();event.stopImmediatePropagation();}},true);
  if(this.section)attachHeadingFold(dom,this.section,this.folded,from=>toggleHeading(from,expected));
  dom.addEventListener('mousedown',e=>{
   if(e.button!==0||e.target.closest('summary,[data-wv-heading-fold]'))return;
   if(e.target.closest('a')&&!e.altKey)return;
   e.preventDefault();if(area.disabled||editor.state.doc!==expected)return;
   if(this.folded){if(toggleHeading(this.block.from,expected,true))editor.focus();return;}
   const user=app.state.user&&app.state.user.id,path=app.state.note;
   revealAtPoint(editor,this.block,{x:e.clientX,y:e.clientY},()=>currentMode===1&&!area.disabled&&editor.state.doc===expected&&app.state.note===path&&(app.state.user&&app.state.user.id)===user);
  });
  return dom;
 }
 ignoreEvent(){return true;}
}

class SourceBlockNumber extends GutterMarker {
  constructor(number) {
    super();
    this.number = number;
  }

  eq(other) {
    return other instanceof SourceBlockNumber &&
      other.number === this.number;
  }

  toDOM() {
    return document.createTextNode(String(this.number));
  }
}

const sourceBlockNumbers = lineNumberWidgetMarker.of(
  (editor, widget, block) => {
    if (!(widget instanceof BlockWidget) &&
        !(widget instanceof PropertiesWidget)) {
      return null;
    }

    const number=widgetSourceNumber(widget.block,editor.state.doc.lineAt(block.from).number);
    return number===null?null:new SourceBlockNumber(number);
  }
);
function decorate(state){
 if(!state.field(live))return Decoration.none;
 const result=[],sections=headingFolds.sections(state),collapsed=headingFolds.visible(state),text=state.doc.toString();
 const previewBlocks=state.field(parsed).flatMap(b=>paragraphRows(text,b,parseDocument)||[b]);
 for(const b of previewBlocks){
  if(collapsed.some(s=>b.from>s.from&&b.from<=s.to))continue;
  if(isNativeTextBlock(b))continue;
  if(inlineListRows(text,b))continue;
  const section=sections.find(s=>s.from===b.from),closed=collapsed.find(s=>s.from===b.from);
  const active=state.selection.ranges.some(r=>r.empty?r.head>=b.from&&r.head<=b.to:r.from<=b.to&&r.to>=b.from);
  if(b.table||b.properties||closed||!active||section&&headingFolds.isPinned(state,section.from)){
   const widget=b.properties?new PropertiesWidget(b):new BlockWidget(b,section,!!closed);
   result.push(b.synthetic?Decoration.widget({widget,block:true,side:-1}).range(b.from):Decoration.replace({widget,block:true,inclusive:true}).range(b.from,closed?closed.to:b.to));
  }
 }
 return Decoration.set(result,true);
}

const decorations=StateField.define({create:decorate,update:(v,tr)=>tr.docChanged||tr.selection||tr.effects.some(e=>e.is(modeEffect))||tr.startState.field(headingFolds.field)!==tr.state.field(headingFolds.field)?decorate(tr.state):v,provide:f=>EditorView.decorations.from(f)});
const theme=EditorView.theme({'&':{color:'var(--text-normal)',backgroundColor:'var(--background-primary)',fontSize:'var(--font-text-size,16px)'},'.cm-content':{fontFamily:'var(--font-text,sans-serif)',minHeight:'300px'},'.cm-content .wv-render':{paddingTop:'0',paddingBottom:'0'},'.cm-scroller':{overflow:'auto'},'.cm-cursor':{borderLeftColor:'var(--text-normal)'},'.cm-gutters':{backgroundColor:'var(--background-secondary)',color:'var(--text-muted)'}});
function permission(){return [EditorState.readOnly.of(area.disabled||area.readOnly),EditorView.editable.of(!area.disabled&&!area.readOnly)];}function renderReading(){
  reading.textContent='';
  if(app.state.user&&!app.state.user.isAdmin&&!app.state.user.mustChangePassword&&app.state.note){
    const expected=view.state.doc,user=app.state.user.id,path=app.state.note;
    const text=expected.toString(),dom=renderHeadingReading({blocks:view.state.field(parsed),sections:headingFolds.sections(view.state),collapsed:headingFolds.visible(view.state),renderTokens,onToggle:from=>toggleHeading(from,expected),onNote:openNote});
    const front=findFrontmatter(text);
    if(!front || dom.firstElementChild&&dom.firstElementChild.tagName==='DETAILS'){
      const panel=createPropertiesPanel(text,{
        readOnly:area.disabled||area.readOnly,onNote:openNote,getSuggestions:propertySuggestions,getNameSuggestions:propertyNameSuggestions,getLinkSuggestions:propertyLinkSuggestions,history:historyBridge&&historyBridge.forCurrentNote(),
        onCommit:change=>{
          if(currentMode!==2||area.disabled||area.readOnly||app.isBusy()||!app.state.user||app.state.user.id!==user||app.state.user.isAdmin||app.state.user.mustChangePassword||app.state.note!==path||view.state.doc!==expected)throw new Error('Свойства изменились или редактор занят. Повторите действие.');
          commitPropertyChange(view,change);
        },
        restoreFocus:key=>{
          if(currentMode!==2||!app.state.user||app.state.user.id!==user||app.state.note!==path)return;
          const control=Array.from(reading.querySelectorAll('[data-wv-property]')).find(n=>n.dataset.wvProperty===key&&!n.disabled);
          if(control)control.focus({preventScroll:true});
        }
      });
      if(front)dom.firstElementChild.replaceWith(panel);else dom.prepend(panel);
    }
    reading.appendChild(dom);
  }
}
function extensions(){return [basicSetup,noteAppearance,wikiLinks.extension,tableCompletion.extension,windowGutters,createSourceMarkdown(findFrontmatter),live,parsed,headingFolds.field,headingFolds.nativeBridge,decorations,nativeText.extension,inlineLists,sourceBlockNumbers,EditorView.atomicRanges.of(v=>{if(!v.state.field(live))return Decoration.none;const ranges=[],all=v.state.field(parsed),p=all.find(b=>b.properties);if(p&&p.to>p.from)ranges.push(Decoration.replace({}).range(p.from,p.to));for(const section of headingFolds.visible(v.state)){const body=nativeHeadingBody(all.find(b=>b.from===section.from),section);ranges.push(Decoration.replace({}).range(body?body.from:section.from,section.to));}return Decoration.set(ranges,true);}),theme,EditorView.lineWrapping,access.of(permission()),EditorView.contentAttributes.of({'aria-label':'Markdown заметки'}),EditorView.updateListener.of(u=>{if(u.docChanged){nativeValue.set.call(area,u.state.doc.toString());area.dispatchEvent(new Event('input',{bubbles:true}));}const foldChanged=u.startState.field(headingFolds.field)!==u.state.field(headingFolds.field);if(currentMode===2&&(u.docChanged||foldChanged))queueMicrotask(()=>{if(currentMode===2)renderReading();});queueMicrotask(()=>historyBridge&&historyBridge.refresh());})];}
function stateFor(text){const p=findFrontmatter(text);return EditorState.create({doc:text,selection:{anchor:currentMode===1&&p?p.end:0},extensions:extensions()});}view=new EditorView({state:stateFor(nativeValue.get.call(area)),parent:host});
Object.defineProperty(area,'value',{configurable:true,get(){return view.state.doc.toString();},set(v){if(!finishTableDraft())throw new Error('Сначала завершите ввод ячейки таблицы.');nativeValue.set.call(area,v);view.setState(stateFor(nativeValue.get.call(area)));if(currentMode===2)renderReading();}});
for(const [name,descriptor] of [['disabled',nativeDisabled],['readOnly',nativeReadOnly]])Object.defineProperty(area,name,{configurable:true,get(){return descriptor.get.call(area);},set(v){descriptor.set.call(area,v);view.dispatch({effects:access.reconfigure(permission())});}});Object.defineProperty(area,'hidden',{configurable:true,get(){return nativeHidden.get.call(area);},set(v){nativeHidden.set.call(area,v);host.hidden=!!v;}});area.focus=()=>view.focus();area.style.display='none';
historyBridge=installPropertyHistory({getView:()=>view,getMode:()=>currentMode,area,reading,app,getEntries:text=>inspectProperties(text).entries,noteRoot:document.getElementById('notesPane')});historyBridge.refresh();
const modes=installModeSlider(i=>{if(!finishTableDraft())return false;currentMode=i;area.hidden=i===2;reading.hidden=i!==2;const p=i===1?findFrontmatter(view.state.doc.toString()):null;view.dispatch({effects:[modeEffect.of(i===1),...headingFolds.nativeModeEffects(view.state,i===0)],annotations:headingFolds.preserve.of(true),...(p&&view.state.selection.main.empty&&view.state.selection.main.head<p.end?{selection:{anchor:p.end}}:{})});if(i===2)renderReading();return true;});new MutationObserver(()=>{if(!app.state.user||app.state.user.isAdmin||app.state.user.mustChangePassword)reading.textContent='';}).observe(document.getElementById('identity'),{childList:true,subtree:true,characterData:true});window.WebVaultCM6={view,modes};app.el('saveNote').hidden=true;app.el('reloadNote').hidden=true;installIndexHooks();installGraph();installTrashRibbon();
window.__WV_LAYOUT_TEST = 'layout-padding0-widgetnumbers-02';

window.__WV_PROPERTIES_TEST = 'properties-undo-06';
window.__WV_PARAGRAPH_TEST = 'paragraph-lines-19b';
window.__WV_WIDGET_CLICK_TEST = 'widget-click-19c';
window.__WV_NATIVE_TEXT_TEST = 'native-text-19d';
window.__WV_HR_GUTTER_TEST = 'hr-gutter-19i';
