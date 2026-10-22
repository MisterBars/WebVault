import test from 'node:test';
import assert from 'node:assert/strict';
import {renderTokens} from './markdown_renderer.js';
class TextNode {
 constructor(text){this.nodeType=3;this.textContent=String(text);}
}
class Element {
 constructor(tag){this.nodeType=1;this.tagName=tag.toUpperCase();this.childNodes=[];this._text='';this.dataset={};this.style={};}
 appendChild(node){this.childNodes.push(node);return node;}
 append(...nodes){for(const node of nodes)this.appendChild(typeof node==='string'?new TextNode(node):node);}
 get children(){return this.childNodes.filter(n=>n.nodeType===1);}
 get firstChild(){return this.childNodes[0]||null;}
 get firstElementChild(){return this.children[0]||null;}
 set textContent(value){this.childNodes=[];this._text=String(value);}
 get textContent(){return this._text+this.childNodes.map(n=>n.textContent).join('');}
 querySelectorAll(tag){const found=[];function visit(node){for(const child of node.childNodes||[]){if(child.tagName===tag.toUpperCase())found.push(child);visit(child);}}visit(this);return found;}
 addEventListener(){}
 setAttribute(name,value){this[name]=String(value);}
}
function render(tokens){
 const previous=globalThis.document;
 globalThis.document={createElement:tag=>new Element(tag),createTextNode:text=>new TextNode(text)};
 try{return renderTokens(tokens);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}
const text=content=>({type:'text',content});
const paragraph=children=>[{type:'paragraph_open',tag:'p',nesting:1},{type:'inline',children},{type:'paragraph_close',tag:'p',nesting:-1}];
test('softbreak creates exactly one visible BR, not collapsible text whitespace',()=>{
 const tokens=paragraph([text('first'),{type:'softbreak'},text('second')]);const root=render(tokens),p=root.children[0];
 assert.equal(p.childNodes.length,3);assert.equal(p.childNodes[1].tagName,'BR');assert.equal(root.querySelectorAll('br').length,1);
 assert.equal(tokens[1].children[1].type,'softbreak');
});
test('explicit hardbreak remains exactly one BR',()=>{
 const root=render(paragraph([text('first'),{type:'hardbreak'},text('second')]));assert.equal(root.querySelectorAll('br').length,1);
});
test('paragraph boundaries are not replaced with extra BR elements',()=>{
 const root=render([...paragraph([text('first')]),...paragraph([text('second')])]);assert.equal(root.querySelectorAll('p').length,2);assert.equal(root.querySelectorAll('br').length,0);
});
test('code fence content keeps literal newlines, no BR substitution',()=>{
 const content='first\nsecond\n';const root=render([{type:'fence',content}]);
 assert.equal(root.querySelectorAll('code')[0].textContent,content);assert.equal(root.querySelectorAll('br').length,0);assert.equal(root.querySelectorAll('pre').length,1);
});
