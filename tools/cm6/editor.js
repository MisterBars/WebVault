import {installPropertyHistory,commitPropertyChange} from './property_history.js';
import {propertyCandidates} from './property_values.js';
import {basicSetup} from 'codemirror';
import {EditorState,Compartment,StateField,StateEffect,Transaction} from '@codemirror/state';
import {EditorView,Decoration,WidgetType,GutterMarker,lineNumberWidgetMarker} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {installModeSlider} from './mode_slider.js';
import {parseDocument,renderTokens,renderDocument,installMarkdownStyle} from './markdown_renderer.js';
import {getNoteIndex,resolveIndexed,installIndexHooks} from './note_index.js';
import {installGraph} from './graph_view.js';
import {findFrontmatter,inspectProperties,createPropertiesPanel,installPropertiesStyle} from './properties.js';
import {installTrashRibbon} from './trash_ribbon.js';
const app=window.WebVaultCore,area=document.getElementById('editor');if(!area||!app)throw new Error('WebVault editor not ready');installMarkdownStyle();installPropertiesStyle();
const nativeValue=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value'),nativeDisabled=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'disabled'),nativeReadOnly=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'readOnly'),nativeHidden=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'hidden');
const host=document.createElement('div'),reading=document.createElement('section');reading.className='wv-reading-pane';reading.hidden=true;reading.setAttribute('aria-label','Просмотр Markdown');area.parentNode.insertBefore(host,area);area.parentNode.insertBefore(reading,area);host.hidden=area.hidden;const access=new Compartment(),modeEffect=StateEffect.define();let currentMode=1,view,historyBridge=null;
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
function openNote(target){if(!app.state.user||app.state.user.isAdmin||app.isBusy())return;const user=app.state.user.id,source=app.state.note||'',old=area.readOnly;area.readOnly=true;app.run(async()=>{try{if(app.state.dirty)await app.saveNote();if(!app.state.user||app.state.user.id!==user||app.state.dirty)throw new Error('Переход отменён: заметка не сохранена или сессия изменилась.');const index=await getNoteIndex({onProgress:t=>app.message(t)}),r=resolveIndexed(index,source,target);if(r.status!=='resolved')throw new Error(r.status==='ambiguous'?'Неоднозначная ссылка: '+r.candidates.join('; '):'Заметка не найдена или ссылка не поддерживается: '+target);if(r.path!==app.state.note)await app.openNote(r.path);if(r.fragment)app.message('Заметка открыта. Переход к заголовку/блоку пока не реализован.');}finally{area.readOnly=old;}});}
const live=StateField.define({create:()=>currentMode===1,update:(v,tr)=>{for(const e of tr.effects)if(e.is(modeEffect))v=e.value;return v;}});
function blocks(state){const text=state.doc.toString(),data=parseDocument(text);const result=data.blocks.map(b=>({from:state.doc.line(b.map[0]+1).from,to:state.doc.line(Math.min(b.map[1],state.doc.lines)).to,tokens:b.tokens,properties:b.tokens[0].type==='wv_properties'})).filter(b=>b.to>b.from);if(!findFrontmatter(text))result.unshift({from:0,to:0,tokens:[],properties:true,synthetic:true});return result;}
const parsed=StateField.define({create:blocks,update:(v,tr)=>tr.docChanged?blocks(tr.state):v});
class PropertiesWidget extends WidgetType{constructor(block){super();this.block=block;}eq(other){return this.block===other.block;}toDOM(editor){const expected=editor.state.doc,user=app.state.user&&app.state.user.id,path=app.state.note;return createPropertiesPanel(expected.toString(),{readOnly:false,onNote:openNote,getSuggestions:propertySuggestions,getNameSuggestions:propertyNameSuggestions,history:historyBridge&&historyBridge.forCurrentNote(),onCommit:change=>{if(currentMode!==1||area.disabled||area.readOnly||app.isBusy()||!app.state.user||app.state.user.id!==user||app.state.note!==path||editor.state.doc!==expected)throw new Error('Свойства изменились или редактор занят. Повторите действие.');commitPropertyChange(editor,change);},restoreFocus:key=>{const control=Array.from(editor.dom.querySelectorAll('[data-wv-property]')).find(n=>n.dataset.wvProperty===key&&!n.disabled);if(control)control.focus();}});}ignoreEvent(){return true;}}
class BlockWidget extends WidgetType{constructor(block){super();this.block=block;}eq(other){return this.block===other.block;}toDOM(editor){const dom=renderTokens(this.block.tokens,openNote);dom.contentEditable='false';dom.addEventListener('mousedown',e=>{if(e.button!==0||e.target.closest('summary'))return;if((e.ctrlKey||e.metaKey)&&e.target.closest('a'))return;e.preventDefault();if(area.disabled)return;editor.dispatch({selection:{anchor:this.block.from},scrollIntoView:true});editor.focus();});return dom;}ignoreEvent(){return true;}}
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

    if(widget.block.synthetic)return null;
    return new SourceBlockNumber(
      editor.state.doc.lineAt(block.from).number
    );
  }
);
function decorate(state){if(!state.field(live))return Decoration.none;const result=[];for(const b of state.field(parsed)){const active=state.selection.ranges.some(r=>r.empty?r.head>=b.from&&r.head<=b.to:r.from<=b.to&&r.to>=b.from);if(b.properties||!active){const widget=b.properties?new PropertiesWidget(b):new BlockWidget(b);result.push(b.synthetic?Decoration.widget({widget,block:true,side:-1}).range(b.from):Decoration.replace({widget,block:true,inclusive:true}).range(b.from,b.to));}}return Decoration.set(result,true);}
const decorations=StateField.define({create:decorate,update:(v,tr)=>tr.docChanged||tr.selection||tr.effects.some(e=>e.is(modeEffect))?decorate(tr.state):v,provide:f=>EditorView.decorations.from(f)});
const theme=EditorView.theme({'&':{color:'var(--text-normal)',backgroundColor:'var(--background-primary)',fontSize:'var(--font-text-size,16px)'},'.cm-content':{fontFamily:'var(--font-text,sans-serif)',minHeight:'300px'},'.cm-content .wv-render':{paddingTop:'0',paddingBottom:'0'},'.cm-scroller':{overflow:'auto'},'.cm-cursor':{borderLeftColor:'var(--text-normal)'},'.cm-gutters':{backgroundColor:'var(--background-secondary)',color:'var(--text-muted)'}});
function permission(){return [EditorState.readOnly.of(area.disabled||area.readOnly),EditorView.editable.of(!area.disabled&&!area.readOnly)];}function renderReading(){
  reading.textContent='';
  if(app.state.user&&!app.state.user.isAdmin&&!app.state.user.mustChangePassword&&app.state.note){
    const expected=view.state.doc,user=app.state.user.id,path=app.state.note;
    const text=expected.toString(),dom=renderDocument(text,openNote);
    const front=findFrontmatter(text);
    if(!front || dom.firstElementChild&&dom.firstElementChild.tagName==='DETAILS'){
      const panel=createPropertiesPanel(text,{
        readOnly:area.disabled||area.readOnly,onNote:openNote,getSuggestions:propertySuggestions,getNameSuggestions:propertyNameSuggestions,history:historyBridge&&historyBridge.forCurrentNote(),
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
function extensions(){return [basicSetup,markdown(),live,parsed,decorations,sourceBlockNumbers,EditorView.atomicRanges.of(v=>{if(!v.state.field(live))return Decoration.none;const p=v.state.field(parsed).find(b=>b.properties);return p&&p.to>p.from?Decoration.set([Decoration.replace({}).range(p.from,p.to)]):Decoration.none;}),theme,EditorView.lineWrapping,access.of(permission()),EditorView.contentAttributes.of({'aria-label':'Markdown заметки'}),EditorView.updateListener.of(u=>{if(u.docChanged){nativeValue.set.call(area,u.state.doc.toString());area.dispatchEvent(new Event('input',{bubbles:true}));if(currentMode===2)queueMicrotask(()=>{if(currentMode===2)renderReading();});}queueMicrotask(()=>historyBridge&&historyBridge.refresh());})];}
function stateFor(text){const p=findFrontmatter(text);return EditorState.create({doc:text,selection:{anchor:currentMode===1&&p?p.end:0},extensions:extensions()});}view=new EditorView({state:stateFor(nativeValue.get.call(area)),parent:host});
Object.defineProperty(area,'value',{configurable:true,get(){return view.state.doc.toString();},set(v){nativeValue.set.call(area,v);view.setState(stateFor(nativeValue.get.call(area)));if(currentMode===2)renderReading();}});
for(const [name,descriptor] of [['disabled',nativeDisabled],['readOnly',nativeReadOnly]])Object.defineProperty(area,name,{configurable:true,get(){return descriptor.get.call(area);},set(v){descriptor.set.call(area,v);view.dispatch({effects:access.reconfigure(permission())});}});Object.defineProperty(area,'hidden',{configurable:true,get(){return nativeHidden.get.call(area);},set(v){nativeHidden.set.call(area,v);host.hidden=!!v;}});area.focus=()=>view.focus();area.style.display='none';
historyBridge=installPropertyHistory({getView:()=>view,getMode:()=>currentMode,area,reading,app,getEntries:text=>inspectProperties(text).entries,noteRoot:document.getElementById('notesPane')});historyBridge.refresh();
const modes=installModeSlider(i=>{currentMode=i;area.hidden=i===2;reading.hidden=i!==2;const p=i===1?findFrontmatter(view.state.doc.toString()):null;view.dispatch({effects:modeEffect.of(i===1),...(p&&view.state.selection.main.empty&&view.state.selection.main.head<p.end?{selection:{anchor:p.end}}:{})});if(i===2)renderReading();return true;});new MutationObserver(()=>{if(!app.state.user||app.state.user.isAdmin||app.state.user.mustChangePassword)reading.textContent='';}).observe(document.getElementById('identity'),{childList:true,subtree:true,characterData:true});window.WebVaultCM6={view,modes};app.el('saveNote').hidden=true;app.el('reloadNote').hidden=true;installIndexHooks();installGraph();installTrashRibbon();
window.__WV_LAYOUT_TEST = 'layout-padding0-widgetnumbers-02';

window.__WV_PROPERTIES_TEST = 'properties-undo-06';
