import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDocument} from './markdown_renderer.js';
test('properties and block maps',()=>{const d=parseDocument('---\ntags: [test]\n---\n\n# Title\n\nText\n');assert.equal(d.tokens[0].type,'wv_properties');assert.deepEqual(d.blocks[0].map,[0,3]);assert.equal(d.blocks.length,3);});
test('table is one root block',()=>{const d=parseDocument('| A | B |\n|---|---|\n| 1 | 2 |\n');assert.equal(d.blocks.length,1);assert.equal(d.blocks[0].tokens[0].type,'table_open');});
test('lists quotes and code are complete blocks',()=>{const d=parseDocument('- a\n- b\n\n> quote\n\n```js\nx()\n```\n');assert.equal(d.blocks.length,3);assert.deepEqual(d.blocks.map(b=>b.tokens[0].type),['bullet_list_open','blockquote_open','fence']);});
test('wiki alias and mark',()=>{const d=parseDocument('[[Note|Alias]] ==mark==');const inline=d.tokens.find(t=>t.type==='inline');assert.ok(inline.children.some(t=>t.type==='wv_wiki'&&t.content==='Alias'));assert.ok(inline.children.some(t=>t.type==='mark_open'));});
test('raw html is not enabled',()=>{const d=parseDocument('<script>alert(1)</script>');assert.ok(!d.tokens.some(t=>t.type==='html_block'));const inline=d.tokens.find(t=>t.type==='inline');assert.ok(inline.children.some(t=>t.type==='text'));});
