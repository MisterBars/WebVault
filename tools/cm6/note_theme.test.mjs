import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {highlightingFor,syntaxTree,ensureSyntaxTree} from '@codemirror/language';
import {tags,highlightTree} from '@lezer/highlight';
import {noteHighlighter,noteAppearance} from './note_theme.js';
import {createSourceMarkdown} from './source_markdown.js';
test('explicit highlighter replaces light fallback for markup roles',()=>{
 const state=EditorState.create({doc:'**x**',extensions:[basicSetup,noteAppearance]});
 assert.equal(highlightingFor(state,[tags.processingInstruction]),'wv-md-formatting');
 assert.equal(highlightingFor(state,[tags.strong]),'wv-md-strong');
 assert.match(noteHighlighter.style([tags.heading1]),/wv-md-h1/);
});
test('real Markdown grammar emits stable formatting, heading and code spans',()=>{
 const doc='# Header\n\n**bold** and *em* and `code` and [label](Note.md)';
 const state=EditorState.create({doc,extensions:[createSourceMarkdown(()=>null),noteAppearance]});ensureSyntaxTree(state,state.doc.length,1000);
 const spans=[];highlightTree(syntaxTree(state),noteHighlighter,(from,to,classes)=>spans.push({text:state.doc.sliceString(from,to),classes}));
 assert.ok(spans.some(s=>s.text.includes('#')&&s.classes.includes('wv-md-formatting')));
 assert.ok(spans.some(s=>s.text.includes('Header')&&s.classes.includes('wv-md-h1')));
 assert.ok(spans.some(s=>s.text.includes('bold')&&s.classes.includes('wv-md-strong')));
 assert.ok(spans.some(s=>s.text.includes('code')&&s.classes.includes('wv-md-code')));
});
test('appearance extensions do not rewrite note text',()=>{
 const doc='---\ntags: [one]\n---\n# Body\n';const state=EditorState.create({doc,extensions:[basicSetup,noteAppearance]});assert.equal(state.doc.toString(),doc);
});
