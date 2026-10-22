import test from 'node:test';
import assert from 'node:assert/strict';
import {appendListValue} from './properties_ui.js';
import {inspectProperties,propertyChange} from './properties.js';

test('chips trim draft, preserve old order and add Unicode',()=>{
  const original=['старый','two'];
  assert.deepEqual(appendListValue(original,' новый '),['старый','two','новый']);
  assert.deepEqual(original,['старый','two']);
});
test('empty and exact duplicate are no-op copies',()=>{
  const a=['one'];
  assert.deepEqual(appendListValue(a,'  '),a);
  assert.deepEqual(appendListValue(a,'one'),a);
  assert.notEqual(appendListValue(a,'one'),a);
  assert.deepEqual(appendListValue(a,'One'),['one','One']);
});
test('newline draft rejected',()=>assert.throws(()=>appendListValue([], 'a\nb')));
test('add/remove list leaves other YAML and body intact',()=>{
  for(const nl of ['\n','\r\n']){
    const s=['---','# keep','tags: ["a", "b"]','title: Keep # comment','---','# Body',''].join(nl);
    const values=appendListValue(['a','b'],'новый').filter((_,i)=>i!==0);
    const c=propertyChange(s,'tags',values);
    const next=s.slice(0,c.from)+c.insert+s.slice(c.to);
    assert.deepEqual(inspectProperties(next).entries.find(e=>e.key==='tags').value,['b','новый']);
    assert.ok(next.includes('title: Keep # comment'+nl));
    assert.ok(next.endsWith('---'+nl+'# Body'+nl));
    assert.ok(next.includes('# keep'+nl));
  }
});

import {parsePropertyWikiLink} from './properties_ui.js';
test('wiki links keep targets and aliases',()=>{
  assert.deepEqual(parsePropertyWikiLink('[[Folder/Note#Heading|Показать]]'),{target:'Folder/Note#Heading',label:'Показать'});
  assert.deepEqual(parsePropertyWikiLink('[[Заметка]]'),{target:'Заметка',label:'Заметка'});
  assert.equal(parsePropertyWikiLink('tag'),null);
  assert.equal(parsePropertyWikiLink('prefix [[Note]]'),null);
  assert.equal(parsePropertyWikiLink('[[]]'),null);
});
