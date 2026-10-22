import test from 'node:test';
import assert from 'node:assert/strict';
import {gutterShift} from './source_gutter_model.js';
const base={paneLeft:304,paneRight:1247,gutterLeft:418,gutterWidth:48,previousShift:0};
test('wide centered editor gutter aligns to window inset',()=>assert.equal(gutterShift(base),-106));
test('narrow pane uses same left edge rule',()=>assert.equal(gutterShift({...base,paneRight:650,gutterLeft:320}),-8));
test('repeated transformed measurements do not drift',()=>{
 const shift=gutterShift(base);assert.equal(gutterShift({...base,gutterLeft:base.gutterLeft+shift,previousShift:shift}),shift);
});
test('horizontal scrolling still keeps gutter at pane left',()=>{
 const shift=gutterShift({...base,gutterLeft:188,previousShift:-106});assert.equal(shift,18);assert.equal(188+shift-(-106),312);
});
test('theme inset and border are respected',()=>assert.equal(gutterShift({...base,border:1,inset:16}),-97));
test('invalid geometry is ignored',()=>{
 for(const extra of [{paneRight:304},{gutterWidth:0},{paneLeft:NaN},{gutterLeft:Infinity}])assert.equal(gutterShift({...base,...extra}),null);
});
test('impossibly narrow viewport falls back to natural placement',()=>assert.equal(gutterShift({...base,paneRight:330}),0));
test('target never crosses the right edge and negative inset is clamped',()=>{
 assert.equal(gutterShift({...base,inset:-10}),-114);
 const shift=gutterShift({...base,paneRight:365,inset:50});assert.equal(base.gutterLeft+shift,315);
});
test('fractional metrics remain stable at hundredths of a pixel',()=>{
 const metrics={...base,paneLeft:304.25,gutterLeft:418.75};const shift=gutterShift(metrics);assert.equal(shift,-106.5);assert.equal(gutterShift({...metrics,gutterLeft:312.25,previousShift:shift}),shift);
});
