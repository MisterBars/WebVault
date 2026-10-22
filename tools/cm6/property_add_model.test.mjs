import test from 'node:test';
import assert from 'node:assert/strict';
import {normalisePropertyName,newPropertyValue,propertyNameHints,collectPropertyNames} from './property_add_model.js';
test('name trimmed, empty/control names rejected',()=>{
 assert.equal(normalisePropertyName('  имя поля  '),'имя поля');
 for(const v of ['','\n','a\nb','x'.repeat(129)])assert.throws(()=>normalisePropertyName(v));
});
test('initial scalar/list types stay typed',()=>{
 assert.equal(newPropertyValue('text','true'),'true');
 assert.equal(newPropertyValue('number','0.75'),0.75);
 assert.equal(newPropertyValue('checkbox',true),true);
 assert.deepEqual(newPropertyValue('list',' [[One|А]] '),['[[One|А]]']);
 assert.deepEqual(newPropertyValue('list',''),[]);
});
test('unsafe numeric values are rejected',()=>{
 for(const v of ['','NaN','Infinity','9007199254740993'])assert.throws(()=>newPropertyValue('number',v));
});
test('date/datetime validation rejects rollover and invalid time',()=>{
 assert.equal(newPropertyValue('date','2024-02-29'),'2024-02-29');
 assert.equal(newPropertyValue('datetime','2026-10-22T18:30'),'2026-10-22T18:30');
 for(const v of ['2025-02-29','2026-13-01'])assert.throws(()=>newPropertyValue('date',v));
 assert.throws(()=>newPropertyValue('datetime','2026-10-22T24:00'));
});
test('standard names and personal names are merged without existing duplicates',()=>{
 const notes=[{propertyNames:[{key:'focus',type:'text'},{key:'score',type:'number'},{key:'focus',type:'text'}]}];
 const hints=propertyNameHints(notes,['TAGS']);
 assert.ok(!hints.some(p=>p.key==='tags'));
 assert.equal(hints.filter(p=>p.key==='focus').length,1);
 assert.equal(hints.find(p=>p.key==='score').type,'number');
 assert.ok(hints.find(p=>p.key==='aliases').standard);
});
test('conflicting types are reported, not changed globally',()=>{
 const hints=propertyNameHints([{propertyNames:[{key:'x',type:'text'},{key:'x',type:'number'}]}],[],'x');
 assert.equal(hints[0].mixed,true);assert.equal(hints[0].type,'text');
});
test('metadata keeps empty fields and recognises tags as list',()=>{
 assert.deepEqual(collectPropertyNames([{key:'tags',type:'tags',readonly:false},{key:'empty',type:'text',readonly:false}]),[{key:'tags',type:'list'},{key:'empty',type:'text'}]);
});
