import test from 'node:test';
import assert from 'node:assert/strict';
import {hasPropertyWiki,propertyWikiDraft,propertyLinkDraft,validatePropertyLinks,parseWholePropertyWiki,propertyLinkChoices} from './property_link_model.js';
test('target draft and alias editing are distinct',()=>{
 const target=propertyWikiDraft('[[Q|Caption]]',3);assert.equal(target.canSuggest,true);assert.equal(target.alias,'Caption');
 const alias=propertyWikiDraft('[[Q|Caption]]',7);assert.equal(alias.inAlias,true);assert.equal(alias.canSuggest,false);assert.equal(alias.complete,true);
});
test('picker inserts exact path and selects editable caption',()=>{
 const result=propertyLinkDraft('[[Q',3,'Folder/Note.md');assert.equal(result.value,'[[/Folder/Note.md|Note]]');assert.equal(result.value.slice(result.selectionStart,result.selectionEnd),'Note');
});
test('existing alias and surrounding scalar text are retained',()=>{
 const value='See [[Q|My caption]] after',result=propertyLinkDraft(value,value.indexOf('Q')+1,'A.md');assert.equal(result.value,'See [[/A.md|My caption]] after');assert.equal(result.value.slice(result.selectionStart,result.selectionEnd),'My caption');
});
test('closing brackets are not duplicated',()=>{
 const result=propertyLinkDraft('[[Q]]',3,'A.md');assert.equal(result.value,'[[/A.md|A]]');
});
test('plain values and escaped literals remain valid',()=>{
 assert.equal(hasPropertyWiki('tag'),false);assert.equal(hasPropertyWiki('\\[[literal'),false);assert.equal(validatePropertyLinks('tag'),true);assert.equal(validatePropertyLinks('\\[[literal'),true);
});
test('unfinished or empty wiki target cannot commit silently',()=>{
 for(const value of ['[[','[[A','[[|caption]]','[[A\nnext]]'])assert.throws(()=>validatePropertyLinks(value));
 assert.equal(validatePropertyLinks('[[A|caption]] and [[B]]'),true);
});
test('property links accept single bracket in caption, not two separate links as one',()=>{
 assert.deepEqual(parseWholePropertyWiki('[[/A.md|Caption [one] ]]'),{target:'/A.md',label:'Caption [one]'});assert.equal(parseWholePropertyWiki('[[A]] [[B]]'),null);assert.equal(parseWholePropertyWiki('tag'),null);
});
test('path matching handles Russian yo and shows duplicates as distinct paths',()=>{
 const paths=['One/Учёт.md','Two/Учёт.md','Other/B.md'];const before=JSON.stringify(paths),result=propertyLinkChoices(paths,'учет','Two/Source.md');assert.equal(result.length,2);assert.equal(result[0].path,'Two/Учёт.md');assert.equal(JSON.stringify(paths),before);
});
test('fragment/embed contexts do not retarget through note menu',()=>{
 assert.equal(propertyWikiDraft('[[A#heading',11).canSuggest,false);assert.equal(propertyWikiDraft('![[A',4),null);assert.equal(hasPropertyWiki('![[A'),false);
});
test('unsafe path is refused and encoded special filename is retained',()=>{
 assert.throws(()=>propertyLinkDraft('[[Q',3,'../A.md'));const r=propertyLinkDraft('[[Q',3,'100% # [A].md');assert.ok(r.value.includes('/100%25 %23 %5BA%5D.md'));
});

test('multiline scalar inserts only the selected current-line wiki span',()=>{
 const value='First\nSee [[Q|Shown]]\nAfter',pos=value.indexOf('Q')+1,result=propertyLinkDraft(value,pos,'Folder/A.md');assert.equal(result.value,'First\nSee [[/Folder/A.md|Shown]]\nAfter');assert.equal(validatePropertyLinks(result.value),true);
});
