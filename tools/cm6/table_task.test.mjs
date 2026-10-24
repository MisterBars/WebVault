import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Transaction} from '@codemirror/state';
import {history,undo,redo} from '@codemirror/commands';
import {parseDocument} from './markdown_renderer.js';
import {tableTaskForCell} from './table_task_model.js';
import {makeTableTaskCheckbox} from './table_task_ui.js';
const doc='| Name | A | B | C |\n| --- | :---: | :---: | :---: |\n| Text | ☐ | ☐ | ☐ |';
function fixture(mode,run){
 const previousWindow=globalThis.window,previousDocument=globalThis.document;let state=EditorState.create({doc,extensions:[history()]});
 const view={get state(){return state;},dispatch(spec){state=spec instanceof Transaction?spec.state:state.update(spec).state;}};
 const access={writable:true,blockedByDraft:false},app={state:{user:{id:1},note:'Matrix.md'},message:()=>{}};
 globalThis.window={WebVaultCM6:{view,modes:{mode}},WebVaultCore:app,WebVaultHistory:{status:()=>access}};
 globalThis.document={createElement(){return {dataset:{},events:{},isConnected:true,setAttribute(name,value){this[name]=value;},addEventListener(name,fn){this.events[name]=fn;},closest(){return null;}};}};
 const from=doc.indexOf('☐'),task={...tableTaskForCell({from,to:from+1,value:'☐'}),sourceText:doc};
 const click=node=>node.events.click({preventDefault(){},stopPropagation(){}});
 try{run({view,app,access,task,click});}finally{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
}
test('parser assigns independent cell coordinates and ignores code/escape',()=>{const tasks=parseDocument(doc).tokens.filter(t=>t.type==='inline'&&t.meta?.wvCellTask).map(t=>t.meta.wvCellTask);assert.equal(tasks.length,3);assert.equal(new Set(tasks.map(t=>t.from)).size,3);assert.deepEqual(tasks.map(t=>t.column),[1,2,3]);const other='| A | B |\n| --- | --- |\n| `☐` | \\☐ |';assert.equal(parseDocument(other).tokens.filter(t=>t.meta?.wvCellTask).length,0);});
test('dynamic and reading checkbox toggle flag and timestamp in one undo step',()=>{for(const mode of [1,2])fixture(mode,({view,task,click})=>{const node=makeTableTaskCheckbox(task);click(node);const checked=view.state.doc.toString();assert.ok(checked.includes('☑ <!--wv-task:'));assert.equal((checked.match(/☐/g)||[]).length,2);assert.ok(undo(view));assert.equal(view.state.doc.toString(),doc);assert.ok(redo(view));assert.equal(view.state.doc.toString(),checked);});});
test('draft, readonly policy, source mismatch and stale account block writes',()=>{fixture(1,({view,app,access,task,click})=>{access.blockedByDraft=true;click(makeTableTaskCheckbox(task));assert.equal(view.state.doc.toString(),doc);access.blockedByDraft=false;access.writable=false;click(makeTableTaskCheckbox(task));assert.equal(view.state.doc.toString(),doc);access.writable=true;click(makeTableTaskCheckbox({...task,sourceText:doc+'x'}));assert.equal(view.state.doc.toString(),doc);const old=makeTableTaskCheckbox(task);app.state.user={id:2};click(old);assert.equal(view.state.doc.toString(),doc);});});
