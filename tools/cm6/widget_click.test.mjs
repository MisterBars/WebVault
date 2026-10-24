import test from 'node:test';
import assert from 'node:assert/strict';
import {revealAtPoint} from './widget_click.js';
function fixture(pos=15){return {state:{doc:{length:100},selection:{}},calls:[],dispatch(s){this.calls.push(s);this.state.selection={anchor:s.selection.anchor};},focus(){this.focused=true;},requestMeasure(m){this.measure=m;},posAtCoords(p,precise){assert.deepEqual(p,{x:30,y:40});assert.equal(precise,false);return pos;},flush(){const p=this.measure.read();this.measure.write(p);}};}
const block={from:10,to:20},point={x:30,y:40};
test('first click maps coordinates, clamps range and never edits text',()=>{
 for(const [pos,want] of [[15,15],[0,10],[99,20],[null,10],[NaN,10]]){const v=fixture(pos);assert.equal(revealAtPoint(v,block,point),true);v.flush();assert.equal(v.state.selection.anchor,want);assert.ok(v.calls.every(c=>!('changes' in c)&&c.scrollIntoView===false));}
});
test('pending correction cannot override changed document or selection',()=>{
 for(const invalidate of [v=>v.state.doc={length:100},v=>v.state.selection={}]){const v=fixture();revealAtPoint(v,block,point);invalidate(v);v.flush();assert.equal(v.calls.length,1);}
});
test('changed external context cancels pending correction',()=>{const v=fixture();let ok=true;revealAtPoint(v,block,point,()=>ok);ok=false;v.flush();assert.equal(v.calls.length,1);});
test('invalid range, coordinates or context do not dispatch',()=>{
 for(const [b,p] of [[{from:-1,to:20},point],[block,{x:NaN,y:40}]]){const v=fixture();assert.equal(revealAtPoint(v,b,p),false);assert.equal(v.calls.length,0);}
 const v=fixture();assert.equal(revealAtPoint(v,block,point,()=>false),false);assert.equal(v.calls.length,0);
});
