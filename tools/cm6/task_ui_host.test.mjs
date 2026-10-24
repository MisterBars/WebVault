import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTaskCheckbox} from './task_ui.js';
test('missing and partial application hosts create readonly controls without throwing',()=>{
 const oldWindow=globalThis.window,oldDocument=globalThis.document;let writes=0;const view={state:{doc:{toString:()=>''},readOnly:false}};
 const hosts=[undefined,{}, {WebVaultCore:{}},{WebVaultCore:{state:{}}},{WebVaultCM6:{view,modes:{mode:1}},WebVaultCore:{state:{note:'Matrix.md'}}},{WebVaultCM6:{view,modes:{mode:1}},WebVaultCore:{state:{user:{},note:'Matrix.md'}}}];
 globalThis.document={createElement:()=>({events:{},isConnected:true,setAttribute(){},addEventListener(k,fn){this.events[k]=fn;},closest:()=>null})};
 try{for(const host of hosts){if(host===undefined)delete globalThis.window;else globalThis.window=host;const node=makeTaskCheckbox({checked:true},null,()=>true,()=>{writes++;});assert.equal(node.disabled,true);node.events.click({preventDefault(){},stopPropagation(){}});}assert.equal(writes,0);}finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
});
