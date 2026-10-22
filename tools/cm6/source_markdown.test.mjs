import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {foldable,ensureSyntaxTree,syntaxTree} from '@codemirror/language';
import {findFrontmatter} from './properties.js';
import {createSourceMarkdown} from './source_markdown.js';
function state(text){const s=EditorState.create({doc:text,extensions:[createSourceMarkdown(findFrontmatter)]});ensureSyntaxTree(s,s.doc.length,1000);return s;}
test('complete frontmatter is explicit, not Setext heading or foldable YAML',()=>{
 for(const prefix of ['','\uFEFF'])for(const nl of ['\n','\r\n']){
  const s=state(prefix+['---','title: A','tags:','  - one','---','# A','body','','# B','tail'].join(nl));
  assert.ok(syntaxTree(s).toString().includes('WVFrontmatter'));
  for(let n=1;n<=5;n++){const line=s.doc.line(n);assert.equal(foldable(s,line.from,line.to),null,'YAML line '+n);}
  const line=s.doc.line(6);assert.ok(foldable(s,line.from,line.to));
 }
});
test('body code folding is not globally disabled',()=>{
 const s=state('---\na: 1\n---\n\n```js\nlet a=1;\nlet b=2;\n```');const line=s.doc.line(5);assert.ok(foldable(s,line.from,line.to));
});
test('closing delimiter without final newline is consumed correctly',()=>{
 const s=state('---\na: 1\n---');assert.ok(syntaxTree(s).toString().includes('WVFrontmatter'));const line=s.doc.line(1);assert.equal(foldable(s,line.from,line.to),null);
});
test('incremental metadata edit keeps following heading available',()=>{
 let s=state('---\ntitle: A\n---\n# A\nbody');s=s.update({changes:{from:11,insert:'New '}}).state;ensureSyntaxTree(s,s.doc.length,1000);const line=s.doc.line(4);assert.ok(foldable(s,line.from,line.to));assert.ok(syntaxTree(s).toString().includes('WVFrontmatter'));
});
