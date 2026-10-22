import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Transaction} from '@codemirror/state';
import {history,undo,redo,undoDepth,redoDepth} from '@codemirror/commands';
import {commitPropertyChange} from './property_history.js';
function fixture(){
 let state=EditorState.create({doc:'created: "2026-10-22"\nBody',extensions:[history()]});
 const view={get state(){return state;},dispatch(spec){state=spec instanceof Transaction?spec.state:state.update(spec).state;}};
 const change=value=>{const text=state.doc.toString(),from=text.indexOf('"'),to=text.indexOf('"',from+1)+1;commitPropertyChange(view,{from,to,insert:JSON.stringify(value)});};
 return {view,change,text:()=>state.doc.toString()};
}
test('date conversion and time edit are separate undo steps; redo restores exact values',()=>{
 const f=fixture();f.change('2026-10-22T00:00');f.change('2026-10-22T12:30');
 assert.equal(undoDepth(f.view.state),2);
 assert.equal(undo(f.view),true);assert.ok(f.text().includes('2026-10-22T00:00'));
 assert.equal(undo(f.view),true);assert.ok(f.text().includes('"2026-10-22"'));assert.equal(undoDepth(f.view.state),0);
 assert.equal(redoDepth(f.view.state),2);assert.equal(redo(f.view),true);assert.equal(redo(f.view),true);assert.ok(f.text().includes('2026-10-22T12:30'));
});
test('selection and effect-only mode-like transactions do not reset history',()=>{
 const f=fixture();f.change('2026-10-22T00:00');f.view.dispatch({selection:{anchor:f.view.state.doc.length}});f.view.dispatch({effects:[]});
 assert.equal(undoDepth(f.view.state),1);assert.equal(undo(f.view),true);assert.ok(f.text().includes('"2026-10-22"'));
});
test('new property edit after undo clears redo branch',()=>{
 const f=fixture();f.change('2026-10-22T00:00');undo(f.view);assert.equal(redoDepth(f.view.state),1);f.change('2026-10-22T08:00');assert.equal(redoDepth(f.view.state),0);
});

import {basicSetup} from 'codemirror';
test('direct commands package sees the same history used by basicSetup',()=>{
 let state=EditorState.create({doc:'a',extensions:[basicSetup]});
 const view={get state(){return state;},dispatch(spec){state=spec instanceof Transaction?spec.state:state.update(spec).state;}};
 commitPropertyChange(view,{from:0,to:1,insert:'b'});
 assert.equal(undoDepth(state),1);assert.equal(undo(view),true);assert.equal(state.doc.toString(),'a');
});
