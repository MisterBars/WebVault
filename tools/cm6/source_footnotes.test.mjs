import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {syntaxTree,ensureSyntaxTree,foldable} from '@codemirror/language';
import {createSourceMarkdown} from './source_markdown.js';
import {findFrontmatter} from './properties.js';
import {collectFootnoteSyntax} from './source_footnotes.js';
function state(doc,enabled=true){const s=EditorState.create({doc,extensions:[createSourceMarkdown(findFrontmatter,{footnotes:enabled})]});ensureSyntaxTree(s,s.doc.length,1000);return s;}
function collect(s){ensureSyntaxTree(s,s.doc.length,1000);return collectFootnoteSyntax(s.doc.toString(),syntaxTree(s));}
test('provided named, repeated, inline and multiparagraph examples connect to the model',()=>{
 const text='First[^first]\n\nSecond[^second]\n\nAgain[^first]\n\nInline.^[Short explanation.]\n\n[^first]: One line.\n\n[^second]: First paragraph.\n\n    Second paragraph.\n\n    Text with **bold** and `code`.\n\n# After';
 const s=state(text),result=collect(s);assert.deepEqual(result.references.map(r=>r.number),[1,2,1,3]);assert.equal(result.notes.length,3);assert.equal(result.notes[1].body,'First paragraph.\n\nSecond paragraph.\n\nText with **bold** and `code`.');assert.equal(result.notes[2].body,'Short explanation.');assert.equal(result.diagnostics.length,0);
 for(const d of result.definitionSources)for(const m of d.bodyMap)assert.equal(d.body.slice(m.bodyFrom,m.bodyTo),s.doc.sliceString(m.from,m.to));assert.ok(syntaxTree(s).toString().includes('ATXHeading1'));
});
test('code, escapes and frontmatter are excluded by the real grammar',()=>{
 const s=state('---\ntitle: "[^x] ^[yaml]"\n---\n\n`[^x] ^[inline code]`\n\n```text\n[^x] ^[fenced]\n```\n\n    [^x] ^[indented]\n\n\\[^x] and \\^[escaped]\n\nReal[^x]\n\n[^x]: body'),result=collect(s);assert.equal(result.references.length,1);assert.equal(result.notes[0].body,'body');
});
test('default source configuration stays unchanged until opt-in',()=>{const s=state('Text[^x]\n\n[^x]: body',false);assert.equal(syntaxTree(s).toString().includes('WVFootnote'),false);assert.equal(collect(s).notes.length,0);});
test('incremental insertion recalculates ranges and first-reference order',()=>{
 let s=state('Text[^b] and [^a]\n\n[^a]: A\n\n[^b]: B');assert.deepEqual(collect(s).notes.map(n=>n.label),['b','a']);s=s.update({changes:{from:0,insert:'[^a] '}}).state;const result=collect(s);assert.deepEqual(result.references.map(r=>r.number),[1,2,1]);assert.deepEqual(result.notes.map(n=>n.label),['a','b']);assert.equal(result.references[0].from,0);
});
test('definition containers do not turn their body into headings, and code folding survives',()=>{
 const s=state('[^x]: first\n\n    # not a document heading\n\n# Real\n\n```js\nlet a=1;\nlet b=2;\n```'),result=collect(s);assert.equal(result.definitionSources.length,1);let headings=0;syntaxTree(s).iterate({enter:n=>{if(n.name.startsWith('ATXHeading'))headings++;}});assert.equal(headings,1);const line=s.doc.line(7);assert.ok(foldable(s,line.from,line.to));
});
test('duplicates, missing references and continuation boundaries remain explicit',()=>{
 const s=state('Missing[^missing], real[^x]\n\n[^x]: first\n\n    continuation\n\n[^x]: duplicate\n\nNext'),result=collect(s);assert.equal(result.references[0].status,'unresolved');assert.equal(result.notes[0].number,1);assert.equal(result.notes[0].body,'first\n\ncontinuation');assert.ok(result.diagnostics.some(d=>d.type==='duplicate-definition'));assert.equal(result.definitionSources.length,2);
});
