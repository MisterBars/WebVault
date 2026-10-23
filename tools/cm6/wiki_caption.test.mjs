import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Transaction} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {CompletionContext} from '@codemirror/autocomplete';
import {ensureSyntaxTree} from '@codemirror/language';
import {undo,redo,undoDepth} from '@codemirror/commands';
import {createWikiCompletions} from './wiki_completion.js';
import {createSourceMarkdown} from './source_markdown.js';
import {findFrontmatter} from './properties.js';
import {parseDocument} from './markdown_renderer.js';
function fixture(doc,pos){
 const app={state:{user:{id:1},hasVault:true,note:'Source.md'},protectedApi:async()=>({files:['A.md','Folder/A.md','Other.md'],folders:[]}),message:()=>{}};
 const wiki=createWikiCompletions(()=>({userId:1,path:'Source.md',mode:0,canWrite:true}),()=>app);
 let state=EditorState.create({doc,selection:{anchor:pos},extensions:[basicSetup,createSourceMarkdown(findFrontmatter),wiki.extension]});ensureSyntaxTree(state,state.doc.length,1000);
 const view={get state(){return state;},dispatch(spec){state=spec instanceof Transaction?spec.state:state.update(spec).state;}};
 return {wiki,view};
}
async function choose(f,path){
 const pos=f.view.state.selection.main.head,result=await f.wiki.source(new CompletionContext(f.view.state,pos,false));
 assert.ok(result);const option=result.options.find(item=>item.label===path);assert.ok(option);option.apply(f.view,option,result.from,pos);return result;
}
test('document choice selects existing caption and preserves surrounding text',async()=>{
 const f=fixture('Before [[A|Моя подпись]] after',10);await choose(f,'/Folder/A.md');
 assert.equal(f.view.state.doc.toString(),'Before [[/Folder/A.md|Моя подпись]] after');
 const s=f.view.state.selection.main;assert.equal(f.view.state.sliceDoc(s.from,s.to),'Моя подпись');
 assert.equal(undoDepth(f.view.state),1);assert.ok(undo(f.view));assert.equal(f.view.state.doc.toString(),'Before [[A|Моя подпись]] after');assert.ok(redo(f.view));assert.equal(f.view.state.doc.toString(),'Before [[/Folder/A.md|Моя подпись]] after');
});
test('default caption is selected and typing replaces only that caption',async()=>{
 const f=fixture('[[A]] tail',3);await choose(f,'/Folder/A.md');
 const s=f.view.state.selection.main;assert.equal(f.view.state.sliceDoc(s.from,s.to),'A');
 f.view.dispatch({changes:{from:s.from,to:s.to,insert:'Другое имя'}});assert.equal(f.view.state.doc.toString(),'[[/Folder/A.md|Другое имя]] tail');
});
test('document menu uses property-style names, paths and multi-word filtering',async()=>{
 const f=fixture('[[folder a',10),result=await f.wiki.source(new CompletionContext(f.view.state,10,false));
 assert.equal(result.filter,false);assert.deepEqual(result.options.map(o=>[o.displayLabel,o.detail]),[['A','Folder/A.md']]);
 assert.equal(result.validFor,undefined);
});
test('wiki token preserves custom caption in paragraph, heading, list and quote',()=>{
 for(const source of ['[[/Folder/A.md|Мой текст]]','# [[/Folder/A.md|Мой текст]]','- [[/Folder/A.md|Мой текст]]','> [[/Folder/A.md|Мой текст]]']){
  const tokens=parseDocument(source).tokens.flatMap(t=>t.children||[]),wiki=tokens.find(t=>t.type==='wv_wiki');
  assert.ok(wiki,source);assert.equal(wiki.content,'Мой текст');assert.equal(wiki.meta.target,'/Folder/A.md');
 }
});
