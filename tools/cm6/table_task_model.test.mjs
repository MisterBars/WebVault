import test from 'node:test';
import assert from 'node:assert/strict';
import {tableTaskForCell,toggleTableTaskChanges} from './table_task_model.js';
const iso='2026-10-24T10:19:00.123Z';
function cell(text,value){const from=text.indexOf(value);return {from,to:from+value.length,value};}
function apply(text,changes){for(const c of [...changes].reverse())text=text.slice(0,c.from)+c.insert+text.slice(c.to);return text;}
test('only selected matrix cell changes',()=>{const s='| Text | ☐ | ☐ | ☐ |',t=tableTaskForCell(cell(s,'☐')),next=apply(s,toggleTableTaskChanges(s,t,new Date(iso)));assert.equal(next,'| Text | ☑ <!--wv-task:'+iso+'--> | ☐ | ☐ |');});
test('every matrix column has independent coordinates',()=>{const s='| Text | ☐ | ☐ | ☐ |',positions=[...s.matchAll(/☐/g)].map(m=>m.index);for(const from of positions){const t=tableTaskForCell({from,to:from+1,value:'☐'}),next=apply(s,toggleTableTaskChanges(s,t,new Date(iso)));assert.equal(next.slice(0,from),s.slice(0,from));assert.ok(next.endsWith(s.slice(from+1)));}});
test('uncheck removes only own timestamp',()=>{const value='☑ <!--wv-task:'+iso+'-->',s='| '+value+' | '+value+' |',next=apply(s,toggleTableTaskChanges(s,tableTaskForCell(cell(s,value))));assert.equal(next,'| ☐ | '+value+' |');});
test('recheck updates timestamp',()=>{const value='[x] label <!--wv-task:'+iso+'-->',s='| '+value+' |',off=apply(s,toggleTableTaskChanges(s,tableTaskForCell(cell(s,value)))),next=apply(off,toggleTableTaskChanges(off,tableTaskForCell(cell(off,'[ ] label')),new Date('2026-10-24T10:20:00.456Z')));assert.equal(next,'| [x] label <!--wv-task:2026-10-24T10:20:00.456Z--> |');});
test('label, escaped pipe and neighbouring CRLF preserved',()=>{const value='[ ] [[A\\|Label]]',s='| '+value+' | y |\r\nnext',next=apply(s,toggleTableTaskChanges(s,tableTaskForCell(cell(s,value)),new Date(iso)));assert.equal(next,'| [x] [[A\\|Label]] <!--wv-task:'+iso+'--> | y |\r\nnext');});
test('code, escapes, links and ordinary cells are not controls',()=>{for(const value of ['`☐`','\\☐','[[A|☐]]','text ☐','[ ](url)','123'])assert.equal(tableTaskForCell({from:0,to:value.length,value}),null);});
test('legacy checked cell without stamp can be unchecked',()=>{const s='| ☑ |';assert.equal(apply(s,toggleTableTaskChanges(s,tableTaskForCell(cell(s,'☑')))),'| ☐ |');});
test('invalid and duplicate stamps reject',()=>{for(const value of ['☑ <!--wv-task:bad-->','☑ <!--wv-task:'+iso+'--> <!--wv-task:'+iso+'-->']){const s='| '+value+' |';assert.throws(()=>toggleTableTaskChanges(s,tableTaskForCell(cell(s,value))));}});
test('stale cell rejects without writing',()=>{const s='| ☐ |',t=tableTaskForCell(cell(s,'☐'));assert.throws(()=>toggleTableTaskChanges('| changed |',t));});
test('whitespace outside cell remains intact',()=>{const s='|   ☐   |',next=apply(s,toggleTableTaskChanges(s,tableTaskForCell(cell(s,'☐')),new Date(iso)));assert.equal(next,'|   ☑ <!--wv-task:'+iso+'-->   |');});
