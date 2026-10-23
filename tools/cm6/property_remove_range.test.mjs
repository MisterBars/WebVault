import test from 'node:test';
import assert from 'node:assert/strict';
import {propertyRemovalRange} from './property_remove_model.js';
function range(body,key,value){const text='---\n'+body+'---\nBody',front={bodyStart:4,bodyEnd:4+body.length};return {text,front,keyRange:[body.indexOf(key),body.indexOf(key)+key.length],valueRange:[body.indexOf(value),body.indexOf(value)+value.length]};}
function remove(f){const c=propertyRemovalRange(f.text,f.front,f.keyRange,f.valueRange);return f.text.slice(0,c.from)+f.text.slice(c.to);}
test('scalar removal preserves neighbouring comments and fields',()=>{assert.equal(remove(range('# keep\na: x # own\n# next\nb: y\n','a','x')),'---\n# keep\n# next\nb: y\n---\nBody');});
test('last property leaves empty frontmatter',()=>{assert.equal(remove(range('a: x\n','a','x')),'---\n---\nBody');});
test('CRLF remains unchanged',()=>{assert.equal(remove(range('a: x\r\nb: y\r\n','a','x')),'---\nb: y\r\n---\nBody');});
test('block value consumes its own lines only',()=>{assert.equal(remove(range('a:\n  - x\n  - y\nb: z\n','a','- x\n  - y\n')),'---\nb: z\n---\nBody');});
test('multiline string ends before following comment',()=>{assert.equal(remove(range('a: |\n  first\n  second\n# keep\nb: z\n','a','|\n  first\n  second\n')),'---\n# keep\nb: z\n---\nBody');});
test('quoted key is removed as a whole',()=>{assert.equal(remove(range('"my key": x\n','"my key"','x')),'---\n---\nBody');});
test('ambiguous key prefix is rejected',()=>{const f=range('? a: x\n','a','x');assert.throws(()=>remove(f));});
test('range crossing frontmatter is rejected',()=>{const f=range('a: x\n','a','x');f.valueRange[1]=1000;assert.throws(()=>remove(f));});
