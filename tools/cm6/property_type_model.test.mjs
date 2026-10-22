import test from 'node:test';
import assert from 'node:assert/strict';
import {convertPropertyValue} from './property_type_model.js';
const entry=(value,type='text',key='custom')=>({value,type,key,readonly:false});
test('text to number and back preserves canonical values',()=>{
 assert.equal(convertPropertyValue(entry('0.75'),'number').value,0.75);
 assert.equal(convertPropertyValue(entry(2,'number'),'text').value,'2');
});
test('noncanonical or imprecise numbers rejected',()=>{
 for(const value of ['001',' 2','2.0','1e3','Infinity','9007199254740993','0.10000000000000001',''])assert.throws(()=>convertPropertyValue(entry(value),'number'));
});
test('checkbox conversion is explicit, never truthiness',()=>{
 assert.equal(convertPropertyValue(entry('false'),'checkbox').value,false);
 assert.equal(convertPropertyValue(entry(1,'number'),'checkbox').value,true);
 assert.equal(convertPropertyValue(entry(false,'checkbox'),'number').value,0);
 for(const value of ['yes','нет','1','TRUE',2])assert.throws(()=>convertPropertyValue(entry(value),'checkbox'));
});
test('single item lists unwrap; multiple items never join silently',()=>{
 assert.equal(convertPropertyValue(entry(['a'],'list'),'text').value,'a');
 assert.equal(convertPropertyValue(entry(['2'],'list'),'number').value,2);
 assert.throws(()=>convertPropertyValue(entry(['a','b'],'list'),'text'));
});
test('list conversion keeps literal wiki links and empty text',()=>{
 assert.deepEqual(convertPropertyValue(entry('[[One|А]]'),'list').value,['[[One|А]]']);
 assert.deepEqual(convertPropertyValue(entry(''),'list').value,['']);
 assert.deepEqual(convertPropertyValue(entry(true,'checkbox'),'list').value,['true']);
 assert.throws(()=>convertPropertyValue(entry('a\nb'),'list'));
});
test('empty lists only become empty text',()=>{
 assert.equal(convertPropertyValue(entry([],'list'),'text').value,'');
 assert.throws(()=>convertPropertyValue(entry([],'list'),'number'));
});
test('date conversions do not drop nonzero time',()=>{
 assert.equal(convertPropertyValue(entry('2026-10-22','date'),'datetime').value,'2026-10-22T00:00');
 assert.equal(convertPropertyValue(entry('2026-10-22T00:00','datetime'),'date').value,'2026-10-22');
 assert.throws(()=>convertPropertyValue(entry('2026-10-22T12:30','datetime'),'date'));
 assert.throws(()=>convertPropertyValue(entry('2025-02-29'),'date'));
});
test('reserved fields stay lists and complex values are protected',()=>{
 for(const key of ['tags','ALIASES','cssclasses'])assert.throws(()=>convertPropertyValue(entry(['a'],'list',key),'text'));
 assert.throws(()=>convertPropertyValue({...entry('a'),readonly:true},'list'));
});
test('preview value conversion is pure',()=>{
 const e=entry(['original'],'list');
 const before=JSON.stringify(e);convertPropertyValue(e,'text');assert.equal(JSON.stringify(e),before);
});
