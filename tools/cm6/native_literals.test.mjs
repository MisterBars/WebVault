import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {createSourceMarkdown} from './source_markdown.js';
import {createNativeText} from './native_text.js';
import {decodeEntity,isNativeTextBlock} from './native_text_model.js';
import {parseDocument} from './markdown_renderer.js';
const blocks=state=>parseDocument(state.doc.toString()).blocks.map(b=>({from:state.doc.line(b.map[0]+1).from,to:state.doc.line(Math.min(b.map[1],state.doc.lines)).to,tokens:b.tokens}));
function setup(doc,live=true){const native=createNativeText({isLive:()=>live,getBlocks:blocks,getHidden:()=>[]});const state=EditorState.create({doc,selection:{anchor:doc.length},extensions:[createSourceMarkdown(()=>null),native.extension]});return {state,native};}
function ranges(state,native){const out=[];state.field(native.field).between(0,state.doc.length,(from,to,value)=>out.push({from,to,spec:value.spec}));return out;}
test('entities are decoded by the existing parser, not inserted as HTML',()=>{
 for(const [raw,value] of [['&amp;','&'],['&lt;','<'],['&gt;','>'],['&nbsp;','\u00a0'],['&copy;','©'],['&#128512;','😀'],['&#x1F600;','😀']])assert.equal(decodeEntity(raw,parseDocument),value,raw);
 for(const raw of ['&bogus;','&NewLine;','plain','<script>'])assert.equal(decodeEntity(raw,parseDocument),null,raw);
});
test('escaped punctuation hides only its slash and retains native text',()=>{
 for(const raw of ['\\*','\\_','\\#','\\>','\\-','\\[','\\`','\\\\']){const {state,native}=setup(raw+' tail'),all=ranges(state,native);assert.ok(all.some(r=>r.from===0&&r.to===1&&!r.spec.widget),raw);assert.equal(state.doc.toString(),raw+' tail');const next=state.update({selection:{anchor:1}}).state;assert.equal(next.selection.main.head,1);assert.ok(!ranges(next,native).some(r=>r.from===0&&r.to===1&&!r.spec.class));}
});
test('entity becomes locally editable without replacing the containing line',()=>{
 const text='a &amp; b tail',{state,native}=setup(text),entity=ranges(state,native).find(r=>r.spec.widget);assert.equal(entity.from,2);assert.equal(entity.to,7);
 const next=state.update({selection:{anchor:4}}).state;assert.equal(next.selection.main.head,4);assert.equal(next.doc.toString(),text);assert.equal(ranges(next,native).filter(r=>r.spec.widget).length,0);
});
test('decoded less-than uses span textContent only',()=>{
 const {state,native}=setup('&lt; tail'),widget=ranges(state,native).find(r=>r.spec.widget).spec.widget,old=globalThis.document;
 globalThis.document={createElement:tag=>({tagName:tag.toUpperCase()})};try{const node=widget.toDOM();assert.equal(node.tagName,'SPAN');assert.equal(node.textContent,'<');assert.equal('innerHTML' in node,false);assert.equal(widget.ignoreEvent(),false);}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
test('literals inside inline and fenced code remain literal',()=>{
 for(const text of ['`\\* &amp;` tail','```text\n\\* &amp;\n```\n\ntail']){const {state,native}=setup(text);assert.equal(ranges(state,native).filter(r=>r.spec.widget).length,0);}
});
test('backslash hardbreak never hides the real source newline',()=>{
 const text='a\\\nb tail',{state,native}=setup(text),all=ranges(state,native);assert.ok(all.some(r=>r.from===1&&r.to===2));assert.equal(state.doc.lines,2);for(const r of all)if(!r.spec.class)assert.equal(state.doc.sliceString(r.from,r.to).includes('\n'),false);
});
test('literal headings are eligible and source mode remains unchanged',()=>{
 const {state}=setup('# A &amp; \\* title\n\nbody');assert.equal(isNativeTextBlock(blocks(state)[0]),true);
 const raw=setup('a &amp; \\* tail',false);assert.equal(ranges(raw.state,raw.native).length,0);
});
