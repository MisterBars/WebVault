import test from 'node:test';
import assert from 'node:assert/strict';
import {renderTokens} from './markdown_renderer.js';
class Element{
 constructor(tag){this.tagName=tag.toUpperCase();this.childNodes=[];this.dataset={};this.style={};this._text='';this.classList={add:()=>{}};}
 appendChild(n){this.childNodes.push(n);return n;}
 append(...nodes){for(const n of nodes)this.appendChild(n);}
 set textContent(s){this.childNodes=[];this._text=String(s);}
 get textContent(){return this._text+this.childNodes.map(n=>n.textContent).join('');}
 querySelectorAll(tag){const result=[];function walk(n){for(const c of n.childNodes||[]){if(c.tagName===tag.toUpperCase())result.push(c);walk(c);}}walk(this);return result;}
 setAttribute(k,v){this[k]=String(v);}
 addEventListener(){}
}
function render(tokens){const old=globalThis.document;globalThis.document={createElement:tag=>new Element(tag),createTextNode:s=>({nodeType:3,textContent:s})};try{return renderTokens(tokens);}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}}
const iso='2026-10-24T11:00:43.763Z',marker='<!--wv-task:'+iso+'-->',task={checked:true,invalid:false,stamp:{iso,raw:' '+marker},sourceText:'',row:1,column:1};
function open(tag){return {type:tag+'_open',tag,nesting:1,attrGet:()=>null};}
function close(tag){return {type:tag+'_close',tag,nesting:-1};}
test('rendered cell shows checkbox and one time but no service comment',()=>{const tokens=[open('table'),open('tr'),open('td'),{type:'inline',meta:{wvCellTask:task},children:[{type:'text',content:'☑ '+marker}]},close('td'),close('tr'),close('table')],before=JSON.stringify(tokens),root=render(tokens);assert.equal(root.querySelectorAll('input').length,1);assert.equal(root.querySelectorAll('time').length,1);assert.equal(root.querySelectorAll('time')[0].dateTime,iso);assert.ok(!root.textContent.includes('wv-task'));assert.equal(JSON.stringify(tokens),before);});
test('service-looking text inside code remains visible',()=>{const root=render([{type:'code_inline',content:marker}]);assert.equal(root.querySelectorAll('code')[0].textContent,marker);});
