import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Transaction} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {CompletionContext} from '@codemirror/autocomplete';
import {ensureSyntaxTree} from '@codemirror/language';
import {undo,undoDepth} from '@codemirror/commands';
import {createWikiCompletions} from './wiki_completion.js';
import {createSourceMarkdown} from './source_markdown.js';
import {findFrontmatter} from './properties.js';
function fixture(doc,pos){
 const messages=[],app={state:{user:{id:1},hasVault:true,note:'Source.md'},protectedApi:async()=>({files:['A.md','Folder/A.md'],folders:[]}),message:text=>messages.push(text)};
 let mode=0;
 const context=()=>({userId:app.state.user&&app.state.user.id,path:app.state.note,mode,canWrite:!!app.state.user&&!app.state.user.isAdmin&&!app.state.user.mustChangePassword&&mode!==2});
 const wiki=createWikiCompletions(context,()=>app);
 let state=EditorState.create({doc,selection:{anchor:pos},extensions:[basicSetup,createSourceMarkdown(findFrontmatter),wiki.extension]});ensureSyntaxTree(state,state.doc.length,1000);
 const view={get state(){return state;},dispatch(spec){state=spec instanceof Transaction?spec.state:state.update(spec).state;}};
 return {app,wiki,view,messages,setMode:value=>mode=value};
}
test('source inserts chosen path, preserves existing alias and avoids extra brackets',async()=>{
 const f=fixture('[[A|Shown]] after',3),result=await f.wiki.source(new CompletionContext(f.view.state,3,false));assert.ok(result);
 const selected=result.options.find(c=>c.label==='/Folder/A.md');selected.apply(f.view,selected,result.from,3);
 assert.equal(f.view.state.doc.toString(),'[[/Folder/A.md|Shown]] after');assert.equal(undoDepth(f.view.state),1);assert.equal(undo(f.view),true);assert.equal(f.view.state.doc.toString(),'[[A|Shown]] after');
});
test('stale catalog/session cannot insert an old choice',async()=>{
 const f=fixture('[[A]]',3),result=await f.wiki.source(new CompletionContext(f.view.state,3,false)),selected=result.options[0];f.wiki.catalog.invalidate();selected.apply(f.view,selected,result.from,3);assert.equal(f.view.state.doc.toString(),'[[A]]');assert.ok(f.messages.length);
});
test('code, metadata and hidden comments are not completion targets',async()=>{
 for(const doc of ['`[[A]]`','```text\n[[A]]\n```','---\nrelated: "[[A]]"\n---\nBody','%% [[A','<!-- [[A']){
  const pos=doc.indexOf('[[A')+3,f=fixture(doc,pos);assert.equal(await f.wiki.source(new CompletionContext(f.view.state,pos,false)),null,doc);
 }
});
test('language data registration preserves default completion sources',()=>{
 const f=fixture('[[A]]',3),sources=f.view.state.languageDataAt('autocomplete',3);assert.ok(sources.includes(f.wiki.source));assert.ok(sources.length>=2);
});
