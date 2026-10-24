import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {createSourceMarkdown} from './source_markdown.js';
import {createNativeText} from './native_text.js';
import {isNativeTextBlock,nativeHeadingBody} from './native_text_model.js';
import {headingSections,visibleCollapsed} from './heading_fold_model.js';
import {parseDocument} from './markdown_renderer.js';
const blocks=state=>parseDocument(state.doc.toString()).blocks.map(b=>({from:state.doc.line(b.map[0]+1).from,to:state.doc.line(Math.min(b.map[1],state.doc.lines)).to,tokens:b.tokens}));
function setup(doc,closed=false){const sections=s=>headingSections(blocks(s),s.doc.length),native=createNativeText({isLive:()=>true,getBlocks:blocks,getSections:sections,getHidden:s=>closed?visibleCollapsed(sections(s),[0]):[],onToggle:()=>{}});const state=EditorState.create({doc,selection:{anchor:doc.length},extensions:[createSourceMarkdown(()=>null),native.extension]});return {state,native};}
function ranges(state,native){const out=[];state.field(native.field).between(0,state.doc.length,(from,to,value)=>out.push({from,to,spec:value.spec}));return out;}
test('ATX H1-H6 and Setext retain native title ranges',()=>{
 for(const title of ['# Title','## Title','### Title','#### Title','##### Title','###### Title','Title\n=====','Title\n-----']){const {state,native}=setup(title+'\n\nbody');assert.equal(isNativeTextBlock(blocks(state)[0]),true,title);const anchor=title.indexOf('Title')+2,next=state.update({selection:{anchor}}).state;assert.equal(next.selection.main.head,anchor);assert.equal(next.doc.toString(),state.doc.toString());assert.equal(ranges(next,native).filter(r=>r.spec.block).length,0);}
});
test('closed section replacement excludes the entire heading',()=>{
 for(const doc of ['# Title\n\nbody','Title\n=====\n\nbody']){const {state,native}=setup(doc,true),header=blocks(state)[0],body=ranges(state,native).find(r=>r.spec.block);assert.equal(body.from,header.to);assert.equal(body.to,doc.length);assert.equal(body.spec.widget,undefined);const anchor=2,next=state.update({selection:{anchor}}).state;assert.equal(next.selection.main.head,anchor);assert.deepEqual(nativeHeadingBody(header,{from:0,to:doc.length}),{from:header.to,to:doc.length});}
});
test('fold control is separate from title text and present for sections with body',()=>{
 const {state,native}=setup('# Title\n\nbody');const controls=ranges(state,native).filter(r=>r.spec.widget);assert.equal(controls.length,1);assert.equal(controls[0].from,0);assert.equal(controls[0].to,0);assert.equal(controls[0].spec.block,undefined);
 const empty=setup('# Title');assert.equal(ranges(empty.state,empty.native).filter(r=>r.spec.widget).length,0);
});
test('special heading links retain fallback and old fold boundary',()=>{
 const state=EditorState.create({doc:'# [[Note]]\n\nbody'}),header=blocks(state)[0];assert.equal(isNativeTextBlock(header),false);assert.equal(nativeHeadingBody(header,{from:0,to:state.doc.length}),null);
});
test('nested closed parent does not create child controls or native body styling',()=>{
 const {state,native}=setup('# Parent\n\n## Child\n\nbody',true);const all=ranges(state,native);assert.equal(all.filter(r=>r.spec.widget).length,1);assert.equal(all.filter(r=>r.spec.block).length,1);
});
