import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {createSourceMarkdown} from './source_markdown.js';
import {findFrontmatter} from './properties.js';
import {markDecorations} from './mark_highlight.js';
import {unselectedParts} from './mark_highlight_model.js';
const source=doc=>EditorState.create({doc,extensions:[createSourceMarkdown(findFrontmatter)]});
function spans(state){const out=[];markDecorations(state).between(0,state.doc.length,(from,to,value)=>out.push({from,to,spec:value.spec}));return out;}
test('mark is styled in source, including visible delimiters, without replacements',()=>{
 const text='plain ==bright== tail',state=source(text),found=spans(state);assert.equal(found.length,1);assert.equal(state.doc.sliceString(found[0].from,found[0].to),'==bright==');assert.equal(found[0].spec.class,'wv-source-mark');assert.equal(found[0].spec.widget,undefined);assert.equal(state.doc.toString(),text);assert.equal(state.selection.main.head,0);
});
test('code, escapes, unclosed delimiters and YAML are not painted as mark',()=>{
 for(const text of ['`==literal==`','```text\n==literal==\n```','    ==literal==','\\==literal==','==unclosed','---\ntags: ==literal==\n---\nbody'])assert.equal(spans(source(text)).length,0,text);
});
test('nested formatting, headings and multiple marks retain source ranges',()=>{
 for(const text of ['==**bold** and *italic*==','# ==heading==']){const state=source(text);assert.equal(spans(state).length,1);assert.equal(state.doc.toString(),text);}
 assert.equal(spans(source('==one== and ==two==')).length,2);
});
test('selection excludes only its source ranges from this background layer',()=>{
 const state=source('==bright=='),next=state.update({selection:{anchor:3,head:6}}).state;
 assert.deepEqual(spans(next).map(r=>[r.from,r.to]),[[0,3],[6,10]]);assert.equal(next.selection.main.anchor,3);assert.equal(next.selection.main.head,6);assert.equal(next.doc.toString(),state.doc.toString());
});
test('empty caret does not remove mark styling',()=>{const state=source('==bright==').update({selection:{anchor:5}}).state;assert.deepEqual(spans(state).map(r=>[r.from,r.to]),[[0,10]]);assert.equal(state.selection.main.head,5);});
test('unselected span policy handles boundaries, overlap and multiple selections',()=>{
 const cases=[
  [[],[[0,10]]],
  [[{empty:true,head:4}],[[0,10]]],
  [[{empty:false,from:3,to:7}],[[0,3],[7,10]]],
  [[{empty:false,from:-2,to:2}],[[2,10]]],
  [[{empty:false,from:8,to:12}],[[0,8]]],
  [[{empty:false,from:-2,to:12}],[]],
  [[{empty:false,from:1,to:3},{empty:false,from:6,to:8}],[[0,1],[3,6],[8,10]]],
  [[{empty:false,from:1,to:6},{empty:false,from:4,to:8}],[[0,1],[8,10]]],
  [[{empty:false,from:10,to:12}],[[0,10]]]
 ];
 for(const [ranges,want] of cases)assert.deepEqual(unselectedParts(0,10,ranges),want);
 assert.deepEqual(unselectedParts(2,2,[]),[]);
});
