import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeTablePipes,tableWikiAllowed,tableWikiValidationText} from './table_link_model.js';
import {createLinkCatalog} from './link_catalog.js';
test('structural pipe escapes removed in cell editor',()=>{assert.equal(decodeTablePipes('[[/A.md\\|Shown]]'),'[[/A.md|Shown]]');});
test('odd slash runs lose only structural slash',()=>{for(const n of [1,3,5])assert.equal(decodeTablePipes('x'+'\\'.repeat(n)+'|y'),'x'+'\\'.repeat(n-1)+'|y');});
test('nonstructural escapes unchanged',()=>{assert.equal(decodeTablePipes('x\\*y'),'x\\*y');assert.equal(decodeTablePipes('x'+'\\'.repeat(2)+'|y'),'x'+'\\'.repeat(2)+'|y');});
test('ordinary wiki query allowed',()=>{const s='before [[A';assert.equal(tableWikiAllowed(s,s.length),true);});
test('code and unclosed code suppress suggestions',()=>{for(const s of ['`[[A','`` x [[A','before `[[A`'])assert.equal(tableWikiAllowed(s,s.indexOf('[[A')+3),false);});
test('closed code before link does not suppress',()=>{const s='`code` [[A';assert.equal(tableWikiAllowed(s,s.length),true);});
test('hidden comment query suppressed',()=>{for(const s of ['<!-- [[A','%% [[A'])assert.equal(tableWikiAllowed(s,s.length),false);});
test('closed comments before query allowed',()=>{for(const s of ['<!-- old --> [[A','%% old %% [[A'])assert.equal(tableWikiAllowed(s,s.length),true);});
test('shared default catalog reuses listing and invalidation',async()=>{let calls=0;const a={state:{user:{id:1},hasVault:true},protectedApi:async()=>{calls++;return {files:['A.md'],folders:[]};}};const x=createLinkCatalog(()=>a),y=createLinkCatalog(()=>a);assert.equal(x,y);const old=await x.ensure();await y.ensure();assert.equal(calls,1);y.invalidate();assert.equal(x.isCurrent(old),false);await x.ensure();assert.equal(calls,2);});
test('explicit limits keep independent catalogs and guard user',async()=>{const a={state:{user:{id:1},hasVault:true},protectedApi:async()=>({files:['A.md'],folders:[]})};const x=createLinkCatalog(()=>a),y=createLinkCatalog(()=>a,{notes:1});assert.notEqual(x,y);const old=await x.ensure();a.state.user={id:2};assert.equal(x.isCurrent(old),false);assert.equal((await x.ensure()).ownerId,2);});

test('validation masks literal wiki in code and comments only',()=>{const s='`[[unfinished` <!-- [[comment --> [[A|Shown]]';const masked=tableWikiValidationText(s);assert.equal(masked.length,s.length);assert.equal(masked.trim(),'[[A|Shown]]');});
