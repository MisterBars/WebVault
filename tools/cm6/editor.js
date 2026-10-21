import {basicSetup} from 'codemirror';
import {EditorState,Compartment,StateField,StateEffect} from '@codemirror/state';
import {EditorView,Decoration} from '@codemirror/view';
import {markdown} from '@codemirror/lang-markdown';
import {syntaxTree} from '@codemirror/language';
const app=window.WebVaultCore,area=document.getElementById('editor');
if(!area||!app)throw new Error('WebVault editor not ready');
const nativeValue=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
const nativeDisabled=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'disabled');
const nativeReadOnly=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'readOnly');
const nativeHidden=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'hidden');
const host=document.createElement('div');area.parentNode.insertBefore(host,area);host.hidden=area.hidden;
const access=new Compartment(),modeEffect=StateEffect.define();
const live=StateField.define({create:()=>true,update:(v,tr)=>{for(const e of tr.effects)if(e.is(modeEffect))v=e.value;return v;}});
function ranges(state){if(!state.field(live))return Decoration.none;const tree=syntaxTree(state),active=[];for(const r of state.selection.ranges){let n=tree.resolveInner(r.head,1);while(n.parent&&n.parent.name!=='Document')n=n.parent;active.push({from:n.from,to:n.to});if(!r.empty)active.push({from:r.from,to:r.to});}
const result=[];function touched(from,to){return active.some(r=>from<=r.to&&to>=r.from);}
tree.iterate({enter(n){if(touched(n.from,n.to))return;let cls='';if(/^ATXHeading[1-6]$/.test(n.name)||/^SetextHeading[12]$/.test(n.name))cls='wv-heading wv-h'+n.name.slice(-1);if(n.name==='StrongEmphasis')cls='wv-strong';if(n.name==='Emphasis')cls='wv-em';if(n.name==='InlineCode')cls='wv-code';if(cls&&n.to>n.from)result.push(Decoration.mark({class:cls}).range(n.from,n.to));if(['HeaderMark','EmphasisMark','CodeMark'].includes(n.name)&&n.to>n.from&&!state.sliceDoc(n.from,n.to).includes('\n'))result.push(Decoration.replace({}).range(n.from,n.to));}});return Decoration.set(result,true);}
const decorations=StateField.define({create:ranges,update:(v,tr)=>ranges(tr.state),provide:f=>EditorView.decorations.from(f)});
const theme=EditorView.theme({'&':{color:'var(--text-normal)',backgroundColor:'var(--background-primary)',fontSize:'var(--font-text-size,16px)'},'.cm-content':{fontFamily:'var(--font-text, sans-serif)',minHeight:'300px'},'.cm-scroller':{overflow:'auto'},'.cm-cursor':{borderLeftColor:'var(--text-normal)'},'.wv-strong':{fontWeight:'700'},'.wv-em':{fontStyle:'italic'},'.wv-code':{fontFamily:'monospace',backgroundColor:'var(--background-secondary)'},'.wv-heading':{fontWeight:'700'},'.wv-h1':{fontSize:'1.8em'},'.wv-h2':{fontSize:'1.5em'},'.wv-h3':{fontSize:'1.3em'},'.cm-gutters':{backgroundColor:'var(--background-secondary)',color:'var(--text-muted)'}});
let view;function permission(){return [EditorState.readOnly.of(area.disabled||area.readOnly),EditorView.editable.of(!area.disabled&&!area.readOnly)];}
function extensions(){return [basicSetup,markdown(),live,decorations,theme,EditorView.lineWrapping,access.of(permission()),EditorView.contentAttributes.of({'aria-label':'Markdown заметки'}),EditorView.updateListener.of(u=>{if(u.docChanged){nativeValue.set.call(area,u.state.doc.toString());area.dispatchEvent(new Event('input',{bubbles:true}));}})];}
view=new EditorView({state:EditorState.create({doc:nativeValue.get.call(area),extensions:extensions()}),parent:host});
Object.defineProperty(area,'value',{configurable:true,get(){return view.state.doc.toString();},set(value){nativeValue.set.call(area,value);view.setState(EditorState.create({doc:nativeValue.get.call(area),extensions:extensions()}));}});
for(const [name,descriptor] of [['disabled',nativeDisabled],['readOnly',nativeReadOnly]])Object.defineProperty(area,name,{configurable:true,get(){return descriptor.get.call(area);},set(v){descriptor.set.call(area,v);view.dispatch({effects:access.reconfigure(permission())});}});
Object.defineProperty(area,'hidden',{configurable:true,get(){return nativeHidden.get.call(area);},set(v){nativeHidden.set.call(area,v);host.hidden=!!v;}});
area.focus=()=>view.focus();area.style.display='none';
const mode=document.createElement('button');mode.type='button';mode.textContent='Исходный код';mode.addEventListener('click',()=>{const next=!view.state.field(live);view.dispatch({effects:modeEffect.of(next)});mode.textContent=next?'Исходный код':'Динамический просмотр';});document.querySelector('#notesPane .view-actions').appendChild(mode);
window.WebVaultCM6={view};
