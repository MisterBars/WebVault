import test from 'node:test';
import assert from 'node:assert/strict';
import {paragraphRows,ensureBreakTails} from './paragraph_preview.js';
import {parseDocument,renderTokens} from './markdown_renderer.js';
function rows(text){const b=parseDocument(text).blocks[0];return paragraphRows(text,{from:0,to:text.length,tokens:b.tokens},parseDocument);}
test('ordinary LF lines have separate source ranges',()=>{assert.deepEqual(rows('first\nsecond').map(r=>[r.from,r.to]),[[0,5],[6,12]]);});
test('BR followed by LF remains two independently addressed source lines',()=>{const r=rows('first<br>\nsecond');assert.equal(r.length,2);assert.equal(r[1].from,10);assert.ok(r[0].tokens.find(t=>t.type==='inline').children.some(t=>t.type==='hardbreak'));});
test('CRLF offsets refer to original source',()=>{assert.deepEqual(rows('first\r\nsecond').map(r=>[r.from,r.to]),[[0,5],[7,13]]);});
test('single-line formatting and wiki links survive row splitting',()=>{assert.equal(rows('**bold**\n[[Note|Alias]]').length,2);});
test('cross-line formatting falls back without changing semantics',()=>{assert.equal(rows('**first\nsecond**'),null);});
test('non-paragraph blocks stay untouched',()=>{assert.equal(rows('# Heading'),null);assert.equal(rows('> quote'),null);assert.equal(rows('- item'),null);});
test('source offset is preserved after preceding content',()=>{const text='prefix\n\nfirst\nsecond',b=parseDocument(text).blocks[1],r=paragraphRows(text,{from:8,to:text.length,tokens:b.tokens},parseDocument);assert.deepEqual(r.map(x=>[x.from,x.to]),[[8,13],[14,20]]);});
test('trailing BR receives one DOM-only tail, internal BR receives none',()=>{
 const previous=globalThis.document;
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.childNodes=[];this.dataset={};this.style={};}
  appendChild(node){this.childNodes.push(node);return node;}
  setAttribute(name,value){this[name]=value;}
  addEventListener(){}
  querySelectorAll(tag){const out=[];const visit=n=>{for(const c of n.childNodes||[]){if(c.tagName===tag.toUpperCase())out.push(c);visit(c);}};visit(this);return out;}
 }
 globalThis.document={createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})};
 try{
  const render=text=>ensureBreakTails(renderTokens(parseDocument(text).tokens));
  const root=render('first<br>');assert.equal(root.querySelectorAll('span').length,1);assert.equal(root.querySelectorAll('span')[0]['aria-hidden'],'true');
  ensureBreakTails(root);assert.equal(root.querySelectorAll('span').length,1);
  assert.equal(render('first<br>\nsecond').querySelectorAll('span').length,0);
  assert.equal(render('`<br>`').querySelectorAll('span').length,0);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
