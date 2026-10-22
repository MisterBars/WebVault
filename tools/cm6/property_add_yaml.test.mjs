import test from 'node:test';
import assert from 'node:assert/strict';
import {propertyAddChange,inspectProperties} from './properties.js';
const apply=(s,c)=>s.slice(0,c.from)+c.insert+s.slice(c.to);
test('addition preserves comments, fields and original body for LF and CRLF',()=>{
 for(const nl of ['\n','\r\n']){
  const s=['---','# keep','title: Keep # inline','---','# Body','text',''].join(nl);
  const c=propertyAddChange(s,'focus','text','new');
  assert.equal(c.from,c.to);
  const next=apply(s,c);
  assert.ok(next.includes('title: Keep # inline'+nl));
  assert.ok(next.endsWith('---'+nl+'# Body'+nl+'text'+nl));
  assert.equal(inspectProperties(next).entries.find(e=>e.key==='focus').value,'new');
 }
});
test('creates frontmatter without replacing body, preserving BOM',()=>{
 for(const s of ['# Body\ntext','\uFEFF# Body\r\ntext','']){
  const c=propertyAddChange(s,'tags','list','');const next=apply(s,c);
  assert.ok(next.endsWith(s.charCodeAt(0)===0xFEFF?s.slice(1):s));
  if(s.charCodeAt(0)===0xFEFF)assert.equal(next.charCodeAt(0),0xFEFF);
  assert.deepEqual(inspectProperties(next).entries[0].value,[]);
 }
});
test('empty YAML and final delimiter without newline are supported',()=>{
 for(const s of ['---\n---','---\n# keep\n---']){
  const next=apply(s,propertyAddChange(s,'score','number','2'));
  assert.equal(inspectProperties(next).entries.find(e=>e.key==='score').value,2);
 }
});
test('duplicate, malformed YAML and reserved wrong type are refused',()=>{
 assert.throws(()=>propertyAddChange('---\nTags: []\n---\nBody','tags','list',''));
 assert.throws(()=>propertyAddChange('---\na: [\n---\nBody','x','text',''));
 assert.throws(()=>propertyAddChange('---\nunfinished','x','text',''));
 assert.throws(()=>propertyAddChange('Body','aliases','number','2'));
});
test('safe quoted key does not inject additional fields',()=>{
 const next=apply('Body',propertyAddChange('Body','a: b # c','text','[[One]]'));
 assert.equal(inspectProperties(next).entries.length,1);
 assert.equal(inspectProperties(next).entries[0].key,'a: b # c');
});
test('dates, checkboxes and numbers survive roundtrip',()=>{
 for(const [type,draft,value] of [['date','2026-10-22','2026-10-22'],['datetime','2026-10-22T18:30','2026-10-22T18:30'],['checkbox',true,true],['number','0.75',0.75]]){
  const next=apply('Body',propertyAddChange('Body','newfield',type,draft));
  assert.equal(inspectProperties(next).entries[0].value,value);
 }
});
