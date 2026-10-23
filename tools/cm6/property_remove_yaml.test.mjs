import test from 'node:test';
import assert from 'node:assert/strict';
import {propertyRemoveChange,inspectProperties} from './properties.js';
function remove(text,key){const c=propertyRemoveChange(text,key);return text.slice(0,c.from)+c.insert+text.slice(c.to);}
test('real YAML scalar, flow list and block list removal preserves neighbours',()=>{
 for(const field of ['gone: value # own\n','gone: [a, b]\n','gone:\n  - a\n  - b\n']){
  const before='---\n# heading\nkeep: "same"\n'+field+'# next\nother: true\n---\nBody';
  assert.equal(remove(before,'gone'),'---\n# heading\nkeep: "same"\n# next\nother: true\n---\nBody');
 }
});
test('last YAML property and quoted names',()=>{assert.equal(remove('---\n"my key": value\n---\nBody','my key'),'---\n---\nBody');});
test('BOM and CRLF preserved',()=>{assert.equal(remove('\uFEFF---\r\ngone: value\r\nkeep: x\r\n---\r\nBody','gone'),'\uFEFF---\r\nkeep: x\r\n---\r\nBody');});
test('invalid YAML, missing key and anchored values rejected',()=>{
 for(const text of ['Body','---\na: [\n---\nBody','---\na: &ref x\nb: *ref\n---\nBody'])assert.throws(()=>remove(text,'a'));
});
test('multiline string removal keeps subsequent comment',()=>{const text='---\ngone: |\n  first\n  second\n# keep\nother: z\n---\nBody';const next=remove(text,'gone');assert.equal(next,'---\n# keep\nother: z\n---\nBody');assert.equal(inspectProperties(next).entries[0].value,'z');});
