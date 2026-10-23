import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Transaction} from '@codemirror/state';
import {history,undo} from '@codemirror/commands';
import {parseDocument} from './markdown_renderer.js';
import {createInlineLists} from './list_inline.js';
function blocks(state){return parseDocument(state.doc.toString()).blocks.map(b=>({from:state.doc.line(b.map[0]+1).from,to:state.doc.line(Math.min(b.map[1],state.doc.lines)).to,tokens:b.tokens}));}
function fixture(doc,pos=doc.length){let live=true,hidden=[];const field=createInlineLists({isLive:()=>live,getBlocks:blocks,getHidden:()=>hidden,onNote:()=>{}});let state=EditorState.create({doc,selection:{anchor:pos},extensions:[history(),field]});return {field,get state(){return state;},dispatch(spec){state=spec instanceof Transaction?spec.state:state.update(spec).state;},setLive(value){live=value;},setHidden(value){hidden=value;}};}
function ranges(f){const out=[];f.state.field(f.field).between(0,f.state.doc.length,(from,to)=>out.push([from,to]));return out;}
test('text cursor retains independent markers and link',()=>{const f=fixture('- text [[A|Shown]]\n- next',4);assert.deepEqual(ranges(f),[[0,2],[7,18],[19,21]]);f.dispatch({selection:{anchor:10}});assert.deepEqual(ranges(f),[[0,2],[19,21]]);f.dispatch({selection:{anchor:1}});assert.deepEqual(ranges(f),[[7,18],[19,21]]);});
test('source and hidden heading body have no list decorations',()=>{const f=fixture('- text\n- next',4);f.setLive(false);f.dispatch({selection:{anchor:5}});assert.deepEqual(ranges(f),[]);f.setLive(true);f.setHidden([{from:-1,to:f.state.doc.length}]);f.dispatch({selection:{anchor:4}});assert.deepEqual(ranges(f),[]);});
test('task/code/formatting fallback keeps block path',()=>{for(const doc of ['- [ ] task','```\n- fake\n```','- **bold**'])assert.deepEqual(ranges(fixture(doc)),[]);});
test('ordinary text edits and undo retain exact markdown',()=>{const doc='- first\n- next',f=fixture(doc,4);f.dispatch({changes:{from:4,insert:'X'}});assert.equal(f.state.doc.toString(),'- fiXrst\n- next');assert.ok(undo(f));assert.equal(f.state.doc.toString(),doc);});
