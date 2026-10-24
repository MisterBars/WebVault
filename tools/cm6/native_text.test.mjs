import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {syntaxTree} from '@codemirror/language';
import {createSourceMarkdown} from './source_markdown.js';
import {createNativeText} from './native_text.js';
import {isNativeTextBlock,markerVisible,markerScope} from './native_text_model.js';
import {parseDocument} from './markdown_renderer.js';
const blocks=state=>parseDocument(state.doc.toString()).blocks.map(b=>({from:state.doc.line(b.map[0]+1).from,to:state.doc.line(Math.min(b.map[1],state.doc.lines)).to,tokens:b.tokens}));
function setup(doc,live=true){const native=createNativeText({isLive:()=>live,getBlocks:blocks,getHidden:()=>[]});const state=EditorState.create({doc,selection:{anchor:doc.length},extensions:[createSourceMarkdown(()=>null),native.extension]});return {state,native};}
function ranges(state,native){const out=[];state.field(native.field).between(0,state.doc.length,(from,to,value)=>out.push({from,to,spec:value.spec}));return out;}
test('native eligibility excludes special paragraphs but includes code',()=>{
 for(const text of ['ordinary text','**bold**','```js\nx()\n```','    code'])assert.equal(isNativeTextBlock(blocks(EditorState.create({doc:text}))[0]),true,text);
 for(const text of ['[[Note]]','text<br>\nnext','[link](https://example.com)','\\*literal','&amp;','> quote'])assert.equal(isNativeTextBlock(blocks(EditorState.create({doc:text}))[0]),false,text);
});
test('both markers of an active construct become visible without moving selection',()=>{
 const {state,native}=setup('**bold** tail');const hidden=ranges(state,native).filter(r=>!r.spec.class);assert.equal(hidden.length,2);
 const next=state.update({selection:{anchor:1}}).state;assert.equal(next.selection.main.head,1);assert.equal(next.doc.toString(),state.doc.toString());
 assert.equal(ranges(next,native).filter(r=>!r.spec.class).length,0);
 assert.equal(markerVisible([{empty:true,head:5}],0,2),false);
});
test('highlight parses outside code and receives native styling',()=>{
 const {state,native}=setup('==bright== tail');let found=false;syntaxTree(state).iterate({enter:n=>{if(n.name==='WVHighlight')found=true;}});assert.ok(found);assert.ok(ranges(state,native).some(r=>r.spec.class==='wv-native-highlight'));
 const code=setup('`==literal==` tail');let nested=false;syntaxTree(code.state).iterate({enter:n=>{if(n.name==='WVHighlight')nested=true;}});assert.equal(nested,false);
});
test('fenced code has no whole-block replacement and retains all source lines',()=>{
 const {state,native}=setup('before\n\n```js\nconst x=1;\nconst y=2;\n```\n\nafter');const all=ranges(state,native);assert.ok(all.some(r=>r.spec.class==='wv-native-code-line'));
 for(const r of all)if(!r.spec.class){assert.equal(state.doc.sliceString(r.from,r.to).includes('\n'),false);assert.equal(r.spec.widget,undefined);}
 assert.equal(state.doc.lines,8);
});
test('source mode receives no dynamic replacements',()=>{const {state,native}=setup('**bold**',false);assert.equal(ranges(state,native).length,0);});
test('caret in text reveals only its construct, not unrelated formatting',()=>{
 for(const text of ['**bold** and *other* tail','*italic* and **other** tail','==bright== and **other** tail','`code` and **other** tail','~~gone~~ and **other** tail']){
  const {state,native}=setup(text),next=state.update({selection:{anchor:3}}).state,split=text.indexOf(' and ');
  assert.equal(next.selection.main.head,3,text);assert.equal(next.doc.toString(),text);
  const hidden=ranges(next,native).filter(r=>!r.spec.class);assert.ok(hidden.every(r=>r.from>split),text);assert.ok(hidden.length>=2,text);
 }
});
test('caret anywhere inside fenced code reveals opening, closing and info',()=>{
 const text='before\n\n```js\nconst x=1;\n```\n\nafter',{state,native}=setup(text);
 assert.ok(ranges(state,native).some(r=>!r.spec.class));
 const anchor=text.indexOf('x=1'),next=state.update({selection:{anchor}}).state;
 assert.equal(next.selection.main.head,anchor);assert.equal(next.doc.toString(),text);assert.equal(ranges(next,native).filter(r=>!r.spec.class).length,0);
 const outside=next.update({selection:{anchor:text.length}}).state;assert.ok(ranges(outside,native).some(r=>!r.spec.class));
});
test('marker scope selects nearest owning construct and has safe fallback',()=>{
 const names=new Set(['StrongEmphasis','InlineCode','FencedCode']),outer={name:'StrongEmphasis',parent:null},inner={name:'InlineCode',parent:outer};
 assert.equal(markerScope({parent:inner},names),inner);
 const node={name:'Unknown',parent:{name:'Document',parent:null}};assert.equal(markerScope(node,names),node);
});
