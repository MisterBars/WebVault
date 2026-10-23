import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTable,tableCellChange,splitTableRow,escapeTablePipes,BASIC_TABLE} from './table_model.js';
const source='before\n\n| Note | Source | Read |\n| --- | :---: | ---: |\n| Text | ☐ |  |\n| Lists | ☐ | ☐ |\n\nafter';
function fixture(){const from=source.indexOf('| Note'),to=source.indexOf('\n\nafter');return parseTable(source,from,to);}
function apply(text,c){return c?text.slice(0,c.from)+c.insert+text.slice(c.to):text;}
test('matrix shape, alignment and empty cells',()=>{const t=fixture();assert.equal(t.width,3);assert.equal(t.rows.length,3);assert.deepEqual(t.alignment,['---',':---:','---:']);assert.equal(t.rows[1][2].value,'');});
test('edit preserves other bytes and alignment',()=>{const t=fixture(),next=apply(source,tableCellChange(source,t,1,0,'Changed'));assert.equal(next,source.replace('| Text |','| Changed |'));});
test('empty cell can be filled',()=>{const t=fixture(),next=apply(source,tableCellChange(source,t,1,2,'ok'));assert.equal(parseTable(next,t.from,t.to+2).rows[1][2].value,'ok');});
test('wiki alias pipe is escaped, not a new column',()=>{const t=fixture(),next=apply(source,tableCellChange(source,t,1,0,'[[A|Label]]'));assert.equal(parseTable(next,t.from,t.to+'[[A\\|Label]]'.length-4).rows[1][0].value,'[[A\\|Label]]');});
test('existing escaped pipes are stable',()=>{assert.equal(escapeTablePipes('a\\|b'),'a\\|b');assert.equal(splitTableRow('| a\\|b | c |').length,2);});
test('rows without outer pipes supported',()=>{assert.equal(parseTable('A | B\n--- | ---\nx | y',0,25).width,2);});
test('CRLF and surrounding text preserved',()=>{const text='| A | B |\r\n| --- | --- |\r\n| x | y |',t=parseTable(text,0,text.length);assert.equal(apply(text,tableCellChange(text,t,1,1,'z')),text.replace('| x | y |','| x | z |'));});
test('stale model, multiline and ragged rows reject',()=>{const t=fixture();assert.throws(()=>tableCellChange(source.replace('Text','Other'),t,1,0,'x'));assert.throws(()=>tableCellChange(source,t,1,0,'x\ny'));assert.throws(()=>parseTable('| a | b |\n| --- | --- |\n| x |',0,100));});
test('unchanged value is a no-op',()=>{assert.equal(tableCellChange(source,fixture(),1,0,'Text'),null);});
test('2x2 template has header plus two data rows',()=>{const t=parseTable(BASIC_TABLE,0,BASIC_TABLE.length);assert.equal(t.width,2);assert.equal(t.rows.length,3);});
