import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDocument,parseFootnoteDocument,parseMarkdownFragment,renderTokens,renderFootnoteDocument} from './markdown_renderer.js';
import {renderHeadingReading} from './heading_fold_ui.js';
const text='First[^a]\n\nAgain[^a] and inline.^[Short *inline* note.]\n\n[^a]: First **bold** paragraph.\n\n    Second with `code`.\n\nAfter';
const refs=data=>data.tokens.flatMap(t=>t.children||[]).filter(t=>t.type==='wv_footnote_ref');
test('reading parser emits numbered references and keeps ordinary parse unchanged',()=>{const plain=parseDocument(text),plan=parseFootnoteDocument(text);assert.equal(refs(plain).length,0);assert.deepEqual(refs(plan).map(r=>[r.meta.number,r.meta.occurrence]),[[1,1],[1,2],[2,1]]);assert.equal(plan.footnotes.model.notes[0].body,'First **bold** paragraph.\n\nSecond with `code`.');assert.equal(plan.blocks[0].tokens[0].meta.wvSourceDocument,text);});
test('reading excludes literal contexts and keeps unresolved references inspectable',()=>{const raw='`[^a]` and \\[^a] and real[^a]\n\nMissing[^missing]\n\n[^a]: body\n\n[^a]: duplicate',plan=parseFootnoteDocument(raw);assert.equal(refs(plan).length,1);assert.ok(plan.tokens.some(t=>t.type==='inline'&&t.content.includes('[^missing]')));assert.equal(plan.footnotes.model.definitionSources.length,2);});
test('fragments retain rich inline content but do not create metadata panels',()=>{const tokens=parseMarkdownFragment('**bold** and `code`\n\n---\na: 1\n---');assert.ok(tokens.flatMap(t=>t.children||[]).some(t=>t.type==='strong_open'));assert.ok(tokens.flatMap(t=>t.children||[]).some(t=>t.type==='code_inline'));assert.ok(!tokens.some(t=>t.type==='wv_properties'));});
class TextNode{constructor(text){this.nodeType=3;this.textContent=text;this.parentNode=null;}}
class Element{
 constructor(tag){this.nodeType=1;this.tagName=tag.toUpperCase();this.childNodes=[];this.dataset={};this.style={};this.listeners={};this.attrs={};this._text='';this.className='';}
 appendChild(node){if(node.parentNode){const a=node.parentNode.childNodes;a.splice(a.indexOf(node),1);}node.parentNode=this;this.childNodes.push(node);return node;}
 append(...nodes){for(const n of nodes)this.appendChild(typeof n==='string'?new TextNode(n):n);}
 get firstChild(){return this.childNodes[0]||null;}get firstElementChild(){return this.childNodes.find(n=>n.nodeType===1)||null;}
 set textContent(value){this.childNodes=[];this._text=String(value);}get textContent(){return this._text+this.childNodes.map(n=>n.textContent).join('');}
 setAttribute(name,value){this.attrs[name]=String(value);}
 addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}
 matches(selector){if(selector[0]==='#')return this.id===selector.slice(1);if(selector[0]==='.')return this.className.split(' ').includes(selector.slice(1));if(selector==='a[data-wv-footnote-target]')return this.tagName==='A'&&!!this.dataset.wvFootnoteTarget;if(selector==='a[data-wv-note]')return this.tagName==='A'&&!!this.dataset.wvNote;return this.tagName===selector.toUpperCase();}
 querySelectorAll(selector){const out=[];const visit=n=>{for(const c of n.childNodes||[]){if(c.matches?.(selector))out.push(c);visit(c);}};visit(this);return out;}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 closest(selector){for(let n=this;n;n=n.parentNode)if(n.matches?.(selector))return n;return null;}
 scrollIntoView(){this.scrolled=true;}focus(){this.focused=true;}
}
function dom(run){const old=globalThis.document;globalThis.document={createElement:tag=>new Element(tag),createTextNode:text=>new TextNode(text)};try{return run();}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}}
function click(root,a){let prevented=false;for(const fn of root.listeners.click||[])fn({target:a,preventDefault(){prevented=true;}});assert.equal(prevented,true);}
test('reading DOM has list, rich bodies and working local forward/back links',()=>dom(()=>{const root=renderFootnoteDocument(text);assert.equal(root.querySelectorAll('sup').length,3);assert.equal(root.querySelectorAll('li').length,2);assert.ok(root.querySelector('strong'));assert.ok(root.querySelector('code'));const ref=root.querySelector('sup').firstChild;click(root,ref);const note=root.querySelector('#'+ref.dataset.wvFootnoteTarget);assert.ok(note.scrolled&&note.focused);const back=note.querySelector('a[data-wv-footnote-target]');click(root,back);assert.ok(root.querySelector('#'+back.dataset.wvFootnoteTarget).focused);assert.equal(root.querySelectorAll('script').length,0);}));
test('actual heading-reading entry point picks the footnote plan from source metadata',()=>dom(()=>{const base=parseDocument(text),root=renderHeadingReading({blocks:[{from:0,to:text.length,tokens:base.tokens}],sections:[],collapsed:[],renderTokens,onToggle:()=>{},onNote:()=>{}});assert.equal(root.querySelectorAll('sup').length,3);assert.equal(root.querySelectorAll('li').length,2);}));
