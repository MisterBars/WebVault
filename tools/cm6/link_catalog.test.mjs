import test from 'node:test';
import assert from 'node:assert/strict';
import {createLinkCatalog} from './link_catalog.js';
function app(){const calls=[];return {calls,state:{user:{id:1},hasVault:true},protectedApi:async(url,data)=>{calls.push(url);assert.equal(data,null);const folder=new URL(url,'https://local.invalid/').searchParams.get('folder');return folder?{files:['Folder/A.md'],folders:[]}:{files:['Root.md'],folders:['Folder']};}};}
test('catalog reads directory listings, not note text/graph, and reuses cache',async()=>{
 const a=app(),c=createLinkCatalog(()=>a),first=await c.ensure(),second=await c.ensure();
 assert.equal(first,second);assert.deepEqual(first.paths,['Folder/A.md','Root.md']);assert.equal(a.calls.length,2);assert.ok(a.calls.every(url=>url.includes('action=list')));assert.equal(c.isCurrent(first),true);
});
test('explicit path changes invalidate suggestions and reload listings',async()=>{
 const a=app(),c=createLinkCatalog(()=>a),old=await c.ensure();c.invalidate();assert.equal(c.isCurrent(old),false);const next=await c.ensure();assert.notEqual(next,old);assert.equal(a.calls.length,4);
});
test('different session never receives the previous path cache',async()=>{
 const a=app(),c=createLinkCatalog(()=>a),old=await c.ensure();a.state.user={id:2};assert.equal(c.isCurrent(old),false);const next=await c.ensure();assert.equal(next.ownerId,2);assert.notEqual(next,old);
});
test('late response after invalidation cannot become current cache',async()=>{
 const a=app();let release;const wait=new Promise(resolve=>release=resolve);a.protectedApi=async()=>{await wait;return {files:['A.md'],folders:[]};};
 const c=createLinkCatalog(()=>a),pending=c.ensure();c.invalidate();release();await assert.rejects(pending);assert.equal(c.status().cached,false);
});
test('limits and admin/forced-password guard remain active',async()=>{
 const a=app(),c=createLinkCatalog(()=>a,{notes:1});await assert.rejects(c.ensure());a.state.user={id:1,isAdmin:true};await assert.rejects(c.ensure());a.state.user={id:1,mustChangePassword:true};await assert.rejects(c.ensure());
});

test('explicit refresh picks up changes made outside this client',async()=>{
 const a=app(),c=createLinkCatalog(()=>a),old=await c.ensure();await c.ensure({refresh:true});assert.equal(c.isCurrent(old),false);assert.equal(a.calls.length,4);
});
