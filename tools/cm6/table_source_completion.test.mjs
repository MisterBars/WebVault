import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,Transaction} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {CompletionContext} from '@codemirror/autocomplete';
import {ensureSyntaxTree} from '@codemirror/language';
import {undo} from '@codemirror/commands';
import {createWikiCompletions} from './wiki_completion.js';
import {createSourceMarkdown} from './source_markdown.js';
import {findFrontmatter} from './properties.js';
import {parseDocument} from './markdown_renderer.js';
function fixture(doc,pos){const app={state:{user:{id:1},hasVault:true,note:'Source.md'},protectedApi:async()=>({files:['A.md','B.md'],folders:[]}),message:()=>{}};const wiki=createWikiCompletions(()=>({userId:1,path:'Source.md',mode:0,canWrite:true}),()=>app);let state=EditorState.create({doc,selection:{anchor:pos},extensions:[basicSetup,createSourceMarkdown(findFrontmatter),wiki.extension]});ensureSyntaxTree(state,state.doc.length,1000);const view={get state(){return state;},dispatch(spec){state=spec instanceof Transaction?spec.state:state.update(spec).state;}};return {wiki,view};}
test('source chosen link renders as wiki token and keeps column count',async()=>{const doc='| A | B |\n| --- | :---: |\n| [[A | keep |',f=fixture(doc,doc.indexOf('[[A')+3),result=await f.wiki.source(new CompletionContext(f.view.state,f.view.state.selection.main.head,false));assert.ok(result);const choice=result.options.find(x=>x.label==='/A.md');choice.apply(f.view,choice,result.from,f.view.state.selection.main.head);const text=f.view.state.doc.toString(),tokens=parseDocument(text).tokens,wiki=tokens.flatMap(t=>t.children||[]).find(t=>t.type==='wv_wiki');assert.ok(text.includes('[[/A.md\\|A]]'));assert.equal(wiki.content,'A');assert.equal(tokens.filter(t=>t.type==='td_open').length,2);const selection=f.view.state.selection.main;assert.equal(f.view.state.sliceDoc(selection.from,selection.to),'A');assert.ok(undo(f.view));assert.equal(f.view.state.doc.toString(),doc);});
test('source incomplete cell never swallows neighbour wiki',async()=>{const doc='| A | B |\n| --- | --- |\n| [[A | [[B\\|Other]] |',f=fixture(doc,doc.indexOf('[[A')+3),result=await f.wiki.source(new CompletionContext(f.view.state,f.view.state.selection.main.head,false));assert.ok(result);const choice=result.options.find(x=>x.label==='/A.md');choice.apply(f.view,choice,result.from,f.view.state.selection.main.head);assert.ok(f.view.state.doc.toString().endsWith(' | [[B\\|Other]] |'));});
