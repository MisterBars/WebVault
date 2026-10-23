import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Transaction} from '@codemirror/state';
import {history,undo,redo} from '@codemirror/commands';
import {parseDocument} from './markdown_renderer.js';
import {createInlineLists} from './list_inline.js';
import {inlineListRows} from './list_inline_model.js';
import {taskForLine,toggleTaskChanges} from './task_model.js';
function blocks(s){return parseDocument(s.doc.toString()).blocks.map(b=>({from:s.doc.line(b.map[0]+1).from,to:s.doc.line(Math.min(b.map[1],s.doc.lines)).to,tokens:b.tokens}));}
function fixture(doc,pos=doc.length){let live=true,hidden=[];const field=createInlineLists({isLive:()=>live,getBlocks:blocks,getHidden:()=>hidden,onNote:()=>{}});let state=EditorState.create({doc,selection:{anchor:pos},extensions:[history(),field]});return {field,get state(){return state;},dispatch(spec){state=spec instanceof Transaction?spec.state:state.update(spec).state;},setLive(v){live=v;},setHidden(v){hidden=v;}};}
function parts(f){const out=[];f.state.field(f.field).between(0,f.state.doc.length,(from,to,v)=>out.push({from,to,kind:v.spec.widget.kind}));return out;}
test('task rows remain line editable before and after blank lines',()=>{const f=fixture('# Conditions\n\n- [ ] Light\n- [ ] Dark\n\n## Next\n',21);const list=blocks(f.state).find(b=>b.tokens[0].type==='bullet_list_open');assert.ok(inlineListRows(f.state.doc.toString(),list));assert.equal(parts(f).filter(p=>p.kind==='task').length,2);f.dispatch({selection:{anchor:30}});assert.ok(parts(f).length);});
test('wiki and marker reveal independently',()=>{const f=fixture('- text [[A|Shown]]\n- next',4);assert.equal(parts(f).filter(p=>p.kind==='link').length,1);f.dispatch({selection:{anchor:10}});assert.equal(parts(f).filter(p=>p.kind==='link').length,0);assert.equal(parts(f).filter(p=>p.kind==='marker').length,2);});
test('unsupported code and formatting do not block other rows',()=>{const f=fixture('- **bold**\n- `code`\n- [[A|Shown]]\n',5);assert.equal(parts(f).filter(p=>p.kind==='marker').length,3);assert.equal(parts(f).filter(p=>p.kind==='link').length,1);});
test('source and collapsed heading have no inline widgets',()=>{const f=fixture('- text\n- next',4);f.setLive(false);f.dispatch({selection:{anchor:5}});assert.equal(parts(f).length,0);f.setLive(true);f.setHidden([{from:-1,to:f.state.doc.length}]);f.dispatch({selection:{anchor:4}});assert.equal(parts(f).length,0);});
test('task flag and timestamp undo and redo together',()=>{const doc='- [ ] task',f=fixture(doc);f.dispatch({changes:toggleTaskChanges(doc,taskForLine(doc),new Date('2026-10-23T17:39:00.123Z'))});const checked=f.state.doc.toString();assert.ok(checked.includes('[x]'));assert.ok(checked.includes('17:39:00.123Z'));assert.ok(undo(f));assert.equal(f.state.doc.toString(),doc);assert.ok(redo(f));assert.equal(f.state.doc.toString(),checked);});
test('renderer annotates actual tasks only and preserves wiki labels',()=>{const tokens=parseDocument('- [ ] [[A|Shown]]\n- `[ ] code`\n').tokens,inline=tokens.filter(t=>t.type==='inline');assert.ok(inline[0].meta.wvTask);assert.equal(inline[1].meta?.wvTask,undefined);assert.equal(inline[0].children.find(t=>t.type==='wv_wiki').content,'Shown');});
