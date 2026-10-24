import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDocument,renderDocument} from './markdown_renderer.js';
const children=source=>parseDocument(source).tokens.flatMap(t=>t.children||[]);
const breaks=source=>children(source).filter(t=>t.type==='hardbreak'||t.type==='softbreak');
test('attribute-free BR forms produce one hardbreak',()=>{
 for(const tag of ['<br>','<br/>','<br />','<BR>','<Br\t/>']){
  const found=breaks('before'+tag+'after');assert.equal(found.length,1,tag);assert.equal(found[0].type,'hardbreak');
 }
});
test('BR followed by LF or CRLF is one break, not two',()=>{
 for(const eol of ['\n','\r\n','  \n'])assert.equal(breaks('before<br>'+eol+'after').length,1);
 assert.equal(breaks('before<br><br>after').length,2);
});
test('attributes, closing tags and other HTML remain literal',()=>{
 for(const source of ['before<br onclick="alert(1)">after','<br class="x">','</br>','<bravo>','<script>alert(1)</script>','<img src=x onerror=alert(1)>']){
  assert.equal(breaks(source).length,0,source);
  assert.ok(!parseDocument(source).tokens.some(t=>t.type==='html_block'));
  assert.ok(!children(source).some(t=>t.type==='html_inline'));
 }
});
test('code, escapes and entities never become BR',()=>{
 for(const source of ['`<br>`','```html\n<br>\n```','    <br>','\\<br>','&lt;br&gt;'])assert.equal(breaks(source).length,0,source);
});
test('existing breaks and source block maps are preserved',()=>{
 for(const source of ['a\nb','a  \nb','a\\\nb'])assert.equal(breaks(source).length,1,source);
 const doc=parseDocument('before<br>\nafter\n\n# Heading\n');
 assert.deepEqual(doc.blocks.map(b=>b.map),[[0,2],[3,4]]);
});
test('DOM contains BR but no executable raw HTML elements',()=>{
 const previous=globalThis.document;
 class Element{
  constructor(tag){this.tagName=tag.toUpperCase();this.childNodes=[];this.dataset={};this.style={};}
  appendChild(node){this.childNodes.push(node);return node;}
  addEventListener(){}
  querySelectorAll(tag){const found=[];const visit=node=>{for(const child of node.childNodes||[]){if(child.tagName===tag.toUpperCase())found.push(child);visit(child);}};visit(this);return found;}
 }
 globalThis.document={createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})};
 try{
  const root=renderDocument('before<br>\nafter\n\n<script>alert(1)</script>');
  assert.equal(root.querySelectorAll('br').length,1);assert.equal(root.querySelectorAll('script').length,0);
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
