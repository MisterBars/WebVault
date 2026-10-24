import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveFootnotes} from './footnote_model.js';
const def=(label,body,from=100)=>({label,body,from,to:from+20});
const ref=(label,from)=>({kind:'named',label,from,to:from+5});
const inline=(body,from)=>({kind:'inline',body,from,to:from+5});
test('named, repeated and inline notes follow first reference order',()=>{
 const result=resolveFootnotes({definitions:[def('second','second',120),def('first','first',100)],references:[inline('inline',30),ref('first',20),ref('second',10),ref('first',0)]});
 assert.deepEqual(result.references.map(r=>[r.number,r.occurrence]),[[1,1],[2,1],[1,2],[3,1]]);assert.deepEqual(result.notes.map(n=>n.body),['first','second','inline']);assert.equal(result.diagnostics.length,0);
});
test('definitions after references and unused definitions do not consume numbers',()=>{
 const result=resolveFootnotes({definitions:[def('unused','not rendered'),def('used','body',200)],references:[ref('used',0)]});assert.equal(result.notes.length,1);assert.equal(result.notes[0].number,1);assert.equal(result.notes[0].definition.from,200);
});
test('missing definition remains unresolved and does not shift valid numbering',()=>{
 const result=resolveFootnotes({definitions:[def('yes','body')],references:[ref('missing',0),ref('yes',10)]});assert.equal(result.references[0].status,'unresolved');assert.equal(result.references[1].number,1);assert.equal(result.diagnostics[0].type,'missing-definition');
});
test('same inline text at different positions creates distinct notes',()=>{const result=resolveFootnotes({references:[inline('same',0),inline('same',10)]});assert.deepEqual(result.references.map(r=>r.number),[1,2]);});
test('multiline formatted body and CRLF are preserved exactly by the model',()=>{
 const body='First paragraph.\r\n\r\nSecond **bold** and `code`.\r\n',result=resolveFootnotes({definitions:[def('multi',body)],references:[ref('multi',0)]});assert.equal(result.notes[0].body,body);assert.deepEqual(result.notes[0].references,[{from:0,to:5,occurrence:1}]);
});
test('first source definition wins duplicates with a diagnostic',()=>{
 const result=resolveFootnotes({definitions:[def('x','later',200),def('x','first',100)],references:[ref('x',0)]});assert.equal(result.notes[0].body,'first');assert.equal(result.diagnostics[0].type,'duplicate-definition');assert.equal(result.definitions.length,1);
});
test('labels are literal, case-sensitive Unicode keys, including prototype-looking names',()=>{
 const result=resolveFootnotes({definitions:[def('__proto__','safe'),def('Тест','upper',130),def('тест','lower',160)],references:[ref('__proto__',0),ref('Тест',10),ref('тест',20)]});assert.deepEqual(result.notes.map(n=>n.body),['safe','upper','lower']);
});
test('invalid events and empty inline notes are diagnosed, never numbered',()=>{
 const result=resolveFootnotes({definitions:[def('bad label','body'),def('ok','body',200)],references:[null,ref('bad label',0),inline(' ',10),{...ref('ok',20),from:-1},ref('ok',30)]});assert.equal(result.notes.length,1);assert.equal(result.notes[0].number,1);assert.equal(result.references.filter(r=>r.status==='invalid').length,4);assert.ok(result.diagnostics.some(d=>d.type==='invalid-definition'));
});
test('overlapping events cannot create duplicate source references',()=>{
 const result=resolveFootnotes({references:[{kind:'inline',body:'outer',from:0,to:20},inline('nested',5),inline('next',20)]});assert.deepEqual(result.references.map(r=>r.status),['resolved','invalid','resolved']);assert.equal(result.notes.length,2);assert.ok(result.diagnostics.some(d=>d.type==='overlapping-reference'));
});
test('note and reference caps leave excess events explicit and preserve existing repeated notes',()=>{
 const result=resolveFootnotes({definitions:[def('x','body')],references:[ref('x',0),inline('over limit',10),ref('x',20),inline('over refs',30)],maxNotes:1,maxReferences:3});assert.deepEqual(result.references.map(r=>r.status),['resolved','limit','resolved','limit']);assert.equal(result.references[2].occurrence,2);assert.equal(result.notes.length,1);
});
test('frozen input events remain unchanged and returned definitions are independent snapshots',()=>{
 const definition=Object.freeze(def('x','body')),reference=Object.freeze(ref('x',0)),input=Object.freeze({definitions:Object.freeze([definition]),references:Object.freeze([reference])}),result=resolveFootnotes(input);result.notes[0].definition.body='changed';assert.equal(definition.body,'body');assert.equal(result.definitions[0].body,'body');assert.equal(reference.from,0);
});
test('empty model, empty named body and invalid configuration are explicit',()=>{
 assert.deepEqual(resolveFootnotes(),{definitions:[],references:[],notes:[],diagnostics:[]});const result=resolveFootnotes({definitions:[def('empty','')],references:[ref('empty',0)]});assert.equal(result.notes[0].body,'');assert.throws(()=>resolveFootnotes({maxNotes:0}),RangeError);assert.throws(()=>resolveFootnotes({references:null}),TypeError);
});
