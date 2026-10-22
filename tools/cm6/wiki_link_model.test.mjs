import test from 'node:test';
import assert from 'node:assert/strict';
import {validNotePath,canonicalWikiTarget,buildWikiLink,wikiContext,inHiddenComment} from './wiki_link_model.js';
import {createResolver} from './note_resolver.js';
test('canonical selection is root-qualified and alias preserves intended display',()=>{
 assert.equal(buildWikiLink('Projects/Учёт.md','Проект учёта'),'[[/Projects/Учёт.md|Проект учёта]]');
 assert.equal(buildWikiLink('Root.md'),'[[/Root.md|Root]]');
});
test('root-qualified paths never fall back to another basename or relative shadow',()=>{
 const r=createResolver(['Root.md','x/Root.md','Projects/A.md','x/Projects/A.md','other/Missing.md']);
 assert.equal(r('x/Source.md','/Root.md').path,'Root.md');assert.equal(r('x/Source.md','/Projects/A.md').path,'Projects/A.md');
 assert.equal(r('x/Source.md','/gone/Missing.md').status,'missing');assert.equal(r('x/Source.md','Root').path,'x/Root.md');
});
test('canonical percent/hash/bracket paths resolve literally, fragment stays separate',()=>{
 const path='Docs/100% # [test].md',target=canonicalWikiTarget(path),r=createResolver([path]);
 assert.equal(r('S.md',target).path,path);assert.equal(r('S.md',target+'#Section').fragment,'Section');
});
test('unsafe paths, traversal and schemes cannot reach vault lookup',()=>{
 for(const path of ['../A.md','/A.md','x//A.md','C:/A.md','x\\A.md','x/./A.md'])assert.equal(validNotePath(path),false);
 const r=createResolver(['A.md']);for(const target of ['/../A.md','/%2e%2e/A.md','/C%3a/A.md'])assert.equal(r('S.md',target).status,'invalid');
 assert.equal(r('S.md','https://evil.invalid/A.md').status,'ignored');assert.equal(r('S.md','//evil.invalid/A.md').status,'ignored');
});
test('completion consumes existing closing brackets and preserves external suffix',()=>{
 const a=wikiContext('before [[qu]] after',11);assert.ok(a);assert.equal('before [[qu]] after'.slice(a.to),' after');
 const b=wikiContext('[[qu]',4);assert.equal(b.to,5);
});
test('existing display text is preserved while completing target',()=>{
 const c=wikiContext('[[qu|My display]] after',4);assert.equal(c.alias,'My display');assert.equal(c.to,17);
 assert.equal(buildWikiLink('Folder/A.md',c.alias),'[[/Folder/A.md|My display]]');
});
test('alias/fragment/escaped/embed contexts do not start target completion',()=>{
 for(const text of ['[[A|label','[[A#section','\\[[A','![[A','[[A]] trailing'])assert.equal(wikiContext(text,text.length),null);
 assert.ok(wikiContext('[[Уч',4));assert.equal(wikiContext('[[A',100),null);
});
test('hidden-comment state ignores code tokens and inspects text only',()=>{
 assert.equal(inHiddenComment([{type:'inline',children:[{type:'code_inline',content:'%%'},{type:'text',content:'normal'}]}]),false);
 assert.equal(inHiddenComment([{type:'inline',children:[{type:'text',content:'%% hidden'}]}]),true);
 assert.equal(inHiddenComment([{type:'inline',children:[{type:'text',content:'<!-- hidden --> visible'}]}]),false);
});
