import test from 'node:test';
import assert from 'node:assert/strict';
import {stripTaskStampTokens} from './task_stamp_tokens.js';
import {tableRemovalChange} from './table_delete_model.js';
import {parseTable} from './table_model.js';
const iso='2026-10-24T11:00:43.763Z',marker='<!--wv-task:'+iso+'-->',task={stamp:{iso,raw:' '+marker},invalid:false},text=content=>({type:'text',content});
function visible(tokens){const clean=stripTaskStampTokens(tokens,task);return clean.map((t,i)=>i===0&&t.type==='text'?t.content.replace(/^(?:\[[ xX]\]|[☐☑])[ \t]?/,''):t.content||'').join('');}
test('regression: prefix removal used to leave metadata visible',()=>{const original='☑ '+marker,old=original.replace(/^[☐☑][ \t]?/,'').replace(task.stamp.raw,'');assert.ok(old.includes('wv-task'));assert.equal(visible([text(original)]),'');});
test('fragmented text tokens lose marker across token boundaries',()=>{assert.equal(visible([text('☑ <'),text('!--wv-task:'+iso),text('-->')]),'');});
test('caption and other comments preserved',()=>{assert.equal(visible([text('☑ label <!--user--> '+marker)]),'label <!--user--> ');});
test('code token never stripped',()=>{const tokens=[{type:'code_inline',content:marker}];assert.equal(stripTaskStampTokens(tokens,task)[0].content,marker);});
test('input tokens not mutated',()=>{const tokens=[text('☑ '+marker)],before=JSON.stringify(tokens);stripTaskStampTokens(tokens,task);assert.equal(JSON.stringify(tokens),before);});
test('invalid metadata remains inspectable',()=>{const tokens=[text('☑ '+marker)];assert.equal(stripTaskStampTokens(tokens,{...task,invalid:true}),tokens);});
test('label-only task and no timestamp are unchanged',()=>{const tokens=[text('☐ label')];assert.equal(stripTaskStampTokens(tokens,{stamp:null}),tokens);});
const table='| A | B |\n| --- | :---: |\n| ☑ '+marker+' | [[A\\|Label]] |';
function apply(s,c){return s.slice(0,c.from)+c.insert+s.slice(c.to);}
test('only table note can become empty',()=>{const t=parseTable(table,0,table.length);assert.equal(apply(table,tableRemovalChange(table,t)),'');});
test('neighbours and separating empty lines preserved',()=>{const s='before\n\n'+table+'\n\nafter',from=s.indexOf('| A'),to=from+table.length;assert.equal(apply(s,tableRemovalChange(s,parseTable(s,from,to))),'before\n\n\nafter');});
test('block trailing blank line not swallowed',()=>{const s=table+'\n\nafter',to=table.length+1;assert.equal(apply(s,tableRemovalChange(s,parseTable(s,0,to))),'\nafter');});
test('CRLF neighbours preserved',()=>{const t=table.replace(/\n/g,'\r\n'),s='before\r\n\r\n'+t+'\r\n\r\nafter',from=s.indexOf('| A');assert.equal(apply(s,tableRemovalChange(s,parseTable(s,from,from+t.length))),'before\r\n\r\n\r\nafter');});
test('stale table rejects deletion',()=>{const t=parseTable(table,0,table.length);assert.throws(()=>tableRemovalChange(table.replace('| A |','| Changed |'),t));});
