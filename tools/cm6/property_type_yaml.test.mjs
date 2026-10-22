import test from 'node:test';
import assert from 'node:assert/strict';
import {propertyTypePreview,inspectProperties} from './properties.js';
const apply=(s,c)=>c?s.slice(0,c.from)+c.insert+s.slice(c.to):s;
test('only selected value changes, inline comments and body preserved',()=>{
 for(const nl of ['\n','\r\n']){
  const s=['---','# keep','x: "2" # inline','other: Keep','---','# Body','text',''].join(nl);
  const p=propertyTypePreview(s,'x','number');
  assert.equal(apply(s,p.change),s.replace('x: "2"','x: 2'));
  assert.equal(inspectProperties(apply(s,p.change)).entries.find(e=>e.key==='x').type,'number');
 }
});
test('text/list roundtrip preserves wiki string and other fields',()=>{
 const s='---\nx: "[[One|А]]"\nother: Keep\n---\nBody';
 const list=apply(s,propertyTypePreview(s,'x','list').change);
 assert.deepEqual(inspectProperties(list).entries[0].value,['[[One|А]]']);
 const text=apply(list,propertyTypePreview(list,'x','text').change);
 assert.equal(inspectProperties(text).entries[0].value,'[[One|А]]');
 assert.ok(text.endsWith('other: Keep\n---\nBody'));
});
test('datetime to date refuses nonzero time; date to text waits for schema',()=>{
 assert.throws(()=>propertyTypePreview('---\nx: "2026-10-22T12:30"\n---','x','date'));
 assert.throws(()=>propertyTypePreview('---\nx: "2026-10-22"\n---','x','text'));
});
test('same type is no-op',()=>assert.equal(propertyTypePreview('---\nx: 2\n---','x','number').change,null));
test('complex/commented lists/aliases/anchors are not rewritten',()=>{
 for(const s of ['---\nx: {a: 1}\n---','---\nx: &ref a\ny: *ref\n---','---\nx:\n  - a # keep\n---'])assert.throws(()=>propertyTypePreview(s,'x','text'));
});
test('reserved list type and duplicate YAML keys protected',()=>{
 assert.throws(()=>propertyTypePreview('---\ntags: [a]\n---','tags','text'));
 assert.throws(()=>propertyTypePreview('---\nx: 1\nx: 2\n---','x','text'));
});
test('boolean and number types persist after conversion',()=>{
 const s='---\nx: "false"\n---\nBody';
 const checkbox=apply(s,propertyTypePreview(s,'x','checkbox').change);
 assert.equal(inspectProperties(checkbox).entries[0].value,false);
 const number=apply(checkbox,propertyTypePreview(checkbox,'x','number').change);
 assert.equal(inspectProperties(number).entries[0].value,0);
});
