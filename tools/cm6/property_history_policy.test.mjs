import test from 'node:test';
import assert from 'node:assert/strict';
import {historyShortcut,isPropertyDraft,mayUseDocumentHistory} from './property_history_policy.js';
const event=extra=>({key:'z',ctrlKey:true,metaKey:false,shiftKey:false,altKey:false,defaultPrevented:false,...extra});
test('undo and redo shortcuts',()=>{
 assert.equal(historyShortcut(event()),'undo');assert.equal(historyShortcut(event({shiftKey:true})),'redo');assert.equal(historyShortcut(event({key:'y'})),'redo');assert.equal(historyShortcut(event({ctrlKey:false,metaKey:true})),'undo');
});
test('native unrelated shortcuts and IME are ignored',()=>{
 for(const e of [{ctrlKey:false},{altKey:true},{isComposing:true},{keyCode:229},{defaultPrevented:true},{key:'s'},{key:'y',shiftKey:true}])assert.equal(historyShortcut(event(e)),null);
});
test('committed datetime is not a draft but changed time is',()=>{
 const entry={type:'datetime',value:'2026-10-22T12:30'};
 assert.equal(isPropertyDraft({type:'datetime-local',value:entry.value},entry),false);
 assert.equal(isPropertyDraft({type:'datetime-local',value:'2026-10-22T13:30'},entry),true);
});
test('list drafts and numeric/boolean controls are recognised',()=>{
 assert.equal(isPropertyDraft({list:true,value:'draft'},{type:'list',value:[]}),true);
 assert.equal(isPropertyDraft({list:true,value:''},{type:'list',value:[]}),false);
 assert.equal(isPropertyDraft({type:'number',value:'2'},{type:'number',value:2}),false);
 assert.equal(isPropertyDraft({type:'checkbox',checked:false},{type:'checkbox',value:false}),false);
});
test('session/permissions/busy guards cannot be bypassed',()=>{
 const good={user:{id:1,isAdmin:false,mustChangePassword:false},hasVault:true,note:'a.md',disabled:false,readOnly:false,busy:false,stateReadOnly:false};
 assert.equal(mayUseDocumentHistory(good),true);
 for(const bad of [{user:null},{user:{isAdmin:true}},{user:{mustChangePassword:true}},{hasVault:false},{note:null},{disabled:true},{readOnly:true},{busy:true},{stateReadOnly:true}])assert.equal(mayUseDocumentHistory({...good,...bad}),false);
});
