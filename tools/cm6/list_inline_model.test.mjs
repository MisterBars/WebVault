import test from 'node:test';
import assert from 'node:assert/strict';
import {inlineListRows,selectionTouches} from './list_inline_model.js';
import {taskForLine,toggleTaskChanges} from './task_model.js';
function block(text){const tokens=[{type:'bullet_list_open'}];text.split('\n').forEach((line,n)=>{if(/^\s*(?:[-+*]|\d+[.)])\s+/.test(line)){tokens.push({type:'list_item_open',map:[n,n+1]},{type:'inline',map:[n,n+1],children:[{type:'text'}]});}});return {from:0,to:text.length,tokens};}
function apply(text,changes){for(const c of [...changes].reverse())text=text.slice(0,c.from)+c.insert+text.slice(c.to);return text;}
test('task list with blank trailing line never falls back to block',()=>{const s='- [ ] Light\n- [ ] Dark\n\n';const rows=inlineListRows(s,block(s));assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.task.checked),[false,false]);});
test('mixed unsupported formatting does not disable markers',()=>{const s='- **bold**\n- plain\n  - child\n';assert.equal(inlineListRows(s,block(s)).length,3);});
test('non-list remains outside inline list handling',()=>{assert.equal(inlineListRows('- fake',{tokens:[{type:'fence'}]}),null);});
test('cursor reveals checkbox independently of other rows',()=>{assert.equal(selectionTouches([{empty:true,head:3}],2,5),true);assert.equal(selectionTouches([{empty:true,head:3}],12,15),false);});
test('code checkbox and escaped checkbox are not tasks',()=>{assert.equal(taskForLine('- `[ ] code`'),null);assert.equal(taskForLine('- \\[ ] escaped'),null);});
test('toggle writes checkbox and full UTC together',()=>{const s='- [ ] task',task=taskForLine(s),next=apply(s,toggleTaskChanges(s,task,new Date('2026-10-23T17:39:00.123Z')));assert.equal(next,'- [x] task <!--wv-task:2026-10-23T17:39:00.123Z-->');});
test('uncheck removes only own timestamp, recheck uses new time',()=>{let s='- [x] task <!--wv-task:2026-10-23T17:39:00.123Z-->';s=apply(s,toggleTaskChanges(s,taskForLine(s)));assert.equal(s,'- [ ] task');s=apply(s,toggleTaskChanges(s,taskForLine(s),new Date('2026-10-23T17:40:00.456Z')));assert.ok(s.endsWith('17:40:00.456Z-->'));});
test('unicode checkbox and CRLF neighbour preserved',()=>{const line='- ☐ task',s=line+'\r\n- other';const next=apply(s,toggleTaskChanges(s,taskForLine(line),new Date('2026-10-23T17:39:00.123Z')));assert.equal(next,'- ☑ task <!--wv-task:2026-10-23T17:39:00.123Z-->\r\n- other');});
test('stale line and malformed metadata reject without writing',()=>{assert.throws(()=>toggleTaskChanges('- [ ] changed',taskForLine('- [ ] task')));const s='- [x] task <!--wv-task:invalid-->';assert.throws(()=>toggleTaskChanges(s,taskForLine(s)));});
test('duplicate timestamps reject',()=>{const s='- [x] a <!--wv-task:2026-10-23T17:39:00.123Z--> <!--wv-task:2026-10-23T17:39:00.123Z-->';assert.throws(()=>toggleTaskChanges(s,taskForLine(s)));});
