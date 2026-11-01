import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const root={Event};vm.runInNewContext(readFileSync(new URL('../../src/WebVault.Web/assets/js/dialog_ux.js',import.meta.url),'utf8'),{window:root});
function fixture(block=false){const handlers={},d={dataset:{},open:true,closed:0,addEventListener(k,f){(handlers[k]??=[]).push(f);},getBoundingClientRect(){return {left:100,top:100,right:500,bottom:500};},dispatchEvent(e){for(const f of handlers[e.type]||[])f(e);return !e.defaultPrevented;},close(){this.open=false;this.closed++;this.dispatchEvent(new Event('close'));}};if(block)d.addEventListener('cancel',e=>e.preventDefault());root.WebVaultDialogUX.bindBackdrop(d);const emit=(type,x=50,y=50,extra={})=>{const e={type,target:d,clientX:x,clientY:y,button:0,pointerId:1,isPrimary:true,preventDefault(){this.prevented=true;},...extra};d.dispatchEvent(e);return e;};return {d,emit,click(){emit('pointerdown');emit('pointerup');return emit('click');}};}
test('completed backdrop click closes through cancel',()=>{const f=fixture();let cancels=0;f.d.addEventListener('cancel',()=>cancels++);assert.equal(f.click().prevented,true);assert.equal(cancels,1);assert.equal(f.d.closed,1);});
test('existing cancel guard prevents backdrop close',()=>{const f=fixture(true);f.click();assert.equal(f.d.open,true);assert.equal(f.d.closed,0);});
test('inside padding targets dialog but is not outside its rectangle',()=>{const f=fixture();f.emit('pointerdown',110,110);f.emit('pointerup',110,110);f.emit('click',110,110);assert.equal(f.d.closed,0);});
test('inside scrollbar region does not close',()=>{const f=fixture();f.emit('pointerdown',499,200);f.emit('pointerup',499,200);f.emit('click',499,200);assert.equal(f.d.closed,0);});
test('drag starting inside and ending outside never closes',()=>{const f=fixture();f.emit('pointerdown',200,200);f.emit('pointerup',50,50);f.emit('click');assert.equal(f.d.closed,0);});
test('outside drag beyond tolerance never closes',()=>{const f=fixture();f.emit('pointerdown',10,10);f.emit('pointerup',50,50);f.emit('click');assert.equal(f.d.closed,0);});
test('different pointers cannot complete the gesture',()=>{const f=fixture();f.emit('pointerdown');f.emit('pointerup',50,50,{pointerId:2});f.emit('click');assert.equal(f.d.closed,0);});
test('secondary button never arms closing',()=>{const f=fixture();f.emit('pointerdown',50,50,{button:2});f.emit('pointerup',50,50,{button:2});f.emit('click',50,50,{button:2});assert.equal(f.d.closed,0);});
test('pointer cancellation invalidates pending gesture',()=>{const f=fixture();f.emit('pointerdown');f.emit('pointercancel');f.emit('pointerup');f.emit('click');assert.equal(f.d.closed,0);});
test('click without pointer sequence does not close',()=>{const f=fixture();f.emit('click');assert.equal(f.d.closed,0);});
test('repeated binding does not duplicate cancel',()=>{const f=fixture();root.WebVaultDialogUX.bindBackdrop(f.d);let count=0;f.d.addEventListener('cancel',()=>count++);f.click();assert.equal(count,1);});
test('descendant clicks cannot masquerade as backdrop',()=>{const f=fixture();const target={};f.emit('pointerdown',50,50,{target});f.emit('pointerup',50,50,{target});f.emit('click',50,50,{target});assert.equal(f.d.closed,0);});
test('sticky header has no inherited top-padding strip',()=>{const css=readFileSync(new URL('../../src/WebVault.Web/assets/css/dialog_ux.css',import.meta.url),'utf8');assert.match(css,/\.wv-dialog-enhanced\{[^}]*padding-top:0/);assert.match(css,/\.wv-dialog-enhanced>\.modal-header\{[^}]*position:sticky;top:0/);});
