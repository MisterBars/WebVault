import test from 'node:test';
import assert from 'node:assert/strict';
import {collectPropertyValues,propertyCandidates,filterPropertyValues,PROPERTY_VALUE_LIMITS} from './property_values.js';
test('collects simple list/text only, does not use object keys',()=>{
  assert.deepEqual(collectPropertyValues([{key:'Tags',type:'tags',value:['a','a','b']},{key:'aliases',type:'text',value:'alias'},{key:'n',type:'number',value:3},{key:'complex',value:{a:1}},{key:'bad',type:'text',value:'a\nb'}]),[['tags',['a','b']],['aliases',['alias']]]);
  assert.deepEqual(collectPropertyValues([{key:'__proto__',type:'text',value:'safe'}]),[['__proto__',['safe']]]);
});
test('isolates property names and excludes current source note',()=>{
 const notes=[{path:'A.md',propertyValues:[['tags',['one']],['aliases',['alias']]]},{path:'B.md',propertyValues:[['tags',['two','one']]]}];
 assert.deepEqual(propertyCandidates(notes,'TAGS','B.md'),['one']);
 assert.deepEqual(propertyCandidates(notes,'aliases','B.md'),['alias']);
 assert.deepEqual(propertyCandidates(notes,'missing','B.md'),[]);
});
test('filters Unicode, excludes exact selected and removes duplicate suggestions',()=>{
 assert.deepEqual(filterPropertyValues(['Привет','пример','Привет','other'],'ПРИ',['Привет']),['пример']);
 assert.deepEqual(filterPropertyValues(['[[One|Alias]]','plain'],'alias',[]),['[[One|Alias]]']);
});
test('menu and collection limits are bounded',()=>{
 assert.equal(filterPropertyValues(Array.from({length:50},(_,i)=>'v'+i),'',[]).length,20);
 assert.equal(collectPropertyValues([{key:'x',value:Array(1200).fill('v')}])[0][1].length,1);
 assert.deepEqual(collectPropertyValues([{key:'x',type:'text',value:'x'.repeat(PROPERTY_VALUE_LIMITS.valueLength+1)}]),[]);
});
