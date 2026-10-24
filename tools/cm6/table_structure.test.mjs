import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Transaction} from '@codemirror/state';
import {history,undo,redo,isolateHistory} from '@codemirror/commands';
import {parseTable} from './table_model.js';
import {tableStructureChange} from './table_structure_model.js';
import {parseDocument} from './markdown_renderer.js';
const doc='| Name | Link | Done |\n| --- | :---: | ---: |\n| one | [[A\\|Alias]] | ☑ <!--wv-task:2026-10-24T11:00:43.763Z--> |\n| two | plain | ☐ |';
function fixture(){let state=EditorState.create({doc,extensions:[history()]});return {get state(){return state;},dispatch(spec){state=spec instanceof Transaction?spec.state:state.update(spec).state;}};}
function act(view,op){const text=view.state.doc.toString(),result=tableStructureChange(text,parseTable(text,0,text.length),op);view.dispatch({changes:result.change,annotations:[Transaction.userEvent.of('input.table.structure'),isolateHistory.of('full')]});}
test('each structural action undo and redo restores exact original text',()=>{for(const op of [{kind:'add-row'},{kind:'add-column'},{kind:'move-row',from:0,to:1},{kind:'move-column',from:2,to:0}]){const view=fixture();act(view,op);const after=view.state.doc.toString();assert.ok(undo(view));assert.equal(view.state.doc.toString(),doc);assert.ok(redo(view));assert.equal(view.state.doc.toString(),after);}});
test('Markdown parser retains blank new columns, wiki and cell task coordinates',()=>{const view=fixture();act(view,{kind:'add-row'});act(view,{kind:'add-column'});let tokens=parseDocument(view.state.doc.toString()).tokens;assert.equal(tokens.filter(t=>t.type==='th_open').length,4);assert.equal(tokens.filter(t=>t.type==='td_open').length,12);act(view,{kind:'move-column',from:2,to:0});tokens=parseDocument(view.state.doc.toString()).tokens;assert.ok(tokens.flatMap(t=>t.children||[]).some(t=>t.type==='wv_wiki'&&t.content==='Alias'));assert.equal(tokens.find(t=>t.meta?.wvCellTask).meta.wvCellTask.column,0);assert.ok(view.state.doc.toString().includes('2026-10-24T11:00:43.763Z'));});
