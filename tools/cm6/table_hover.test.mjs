import test from 'node:test';
import assert from 'node:assert/strict';
import {wrapTableHandle} from './table_hover_ui.js';
class Node{
 constructor(tag='span'){this.tagName=tag;this.dataset={};this.children=[];this.events={};this.isConnected=true;this.focused=false;}
 appendChild(n){this.children.push(n);n.parentElement=this;return n;}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 setAttribute(k,v){this[k]=v;}
 focus(options){this.focused=options;}
}
function fixture(run){const old=globalThis.document,map=new Map();globalThis.document={createElement:tag=>new Node(tag),getElementById:id=>map.get(id)||null,head:{appendChild:n=>map.set(n.id,n)}};try{run({map});}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}}
test('row and column get transparent contiguous hitbox parents',()=>fixture(()=>{for(const axis of ['row','column']){const cell=new Node('td'),node=new Node(),zone=wrapTableHandle(cell,node,axis);assert.equal(zone.className,'wv-table-'+axis+'-hitbox');assert.equal(zone.dataset.wvTableControls,'true');assert.equal(node.parentElement,zone);assert.equal(zone.parentElement,cell);}}));
test('bare margin click does not reach cell editing',()=>fixture(()=>{const zone=wrapTableHandle(new Node(),new Node(),'row');let prevent=0,stop=0;zone.events.mousedown[0]({target:zone,preventDefault(){prevent++;},stopPropagation(){stop++;}});assert.equal(prevent,1);assert.equal(stop,1);}));
test('mousedown on handle is not default-cancelled by hitbox',()=>fixture(()=>{const node=new Node(),zone=wrapTableHandle(new Node(),node,'column');let prevent=0;zone.events.mousedown[0]({target:node,preventDefault(){prevent++;},stopPropagation(){}});assert.equal(prevent,0);}));
test('click explicitly focuses handle and exposes keyboard shortcut',()=>fixture(()=>{const node=new Node();wrapTableHandle(new Node(),node,'row');node.events.click[0]();assert.deepEqual(node.focused,{preventScroll:true});assert.equal(node['aria-keyshortcuts'],'Alt+ArrowUp Alt+ArrowDown');}));
test('single stylesheet reserves margin bands and places menu above them',()=>fixture(({map})=>{wrapTableHandle(new Node(),new Node(),'row');wrapTableHandle(new Node(),new Node(),'column');assert.equal(map.size,1);const css=map.get('wv-table-hover-style').textContent;assert.ok(css.includes('left:-22px;top:0;bottom:0;width:22px'));assert.ok(css.includes('left:0;right:0;top:-22px;height:22px'));assert.ok(css.includes('.wv-table-column-tools{z-index:3}'));}));
