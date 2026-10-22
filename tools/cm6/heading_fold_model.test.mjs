import test from 'node:test';
import assert from 'node:assert/strict';
import {headingSections,visibleCollapsed,sectionAtNativeFold} from './heading_fold_model.js';
const head=(from,to,level,label='Title')=>({from,to,tokens:[{type:'heading_open',tag:'h'+level},{type:'inline',content:label}]});
const paragraph=(from,to,type='paragraph_open')=>({from,to,tokens:[{type}]});
test('section ends at next same or higher heading, not at child',()=>{
 const blocks=[head(0,3,1),paragraph(5,10),head(12,16,2),paragraph(18,23),head(25,28,1),paragraph(30,35)];
 const s=headingSections(blocks,35);assert.equal(s[0].to,24);assert.equal(s[1].to,24);assert.equal(s[2].to,35);assert.ok(s.every(s=>s.hasBody));
});
test('nested collapsed sections keep flags but render only outer interval',()=>{
 const s=headingSections([head(0,3,1),head(5,8,2),paragraph(10,20),head(22,25,1),paragraph(27,30)],30);
 assert.deepEqual(visibleCollapsed(s,[0,5]).map(s=>s.from),[0]);assert.deepEqual(visibleCollapsed(s,[5]).map(s=>s.from),[5]);
});
test('frontmatter, code and list containers do not become headings',()=>{
 const s=headingSections([paragraph(0,20,'wv_properties'),paragraph(22,40,'fence'),paragraph(42,60,'bullet_list_open'),head(62,65,1),paragraph(67,70)],70);assert.deepEqual(s.map(s=>s.from),[62]);
});
test('empty headings have no rendered folding control',()=>{
 const s=headingSections([head(0,3,1),head(5,8,1)],10);assert.equal(s[0].hasBody,false);assert.equal(s[1].hasBody,false);
});
test('setext is identified from heading tokens, not source regex',()=>{
 const s=headingSections([head(0,15,2,'Setext'),paragraph(17,20)],20);assert.equal(s[0].headerTo,15);assert.equal(s[0].hasBody,true);assert.equal(sectionAtNativeFold(s,6).from,0);
});
test('same-level neighbours collapse independently',()=>{
 const s=headingSections([head(0,3,2),paragraph(5,8),head(10,13,2),paragraph(15,18)],18);assert.deepEqual(visibleCollapsed(s,[0,10]).map(s=>s.from),[0,10]);
});
test('native fold starts must belong to actual heading lines',()=>{
 const s=headingSections([head(0,3,1),paragraph(5,20)],20);assert.equal(sectionAtNativeFold(s,3).from,0);assert.equal(sectionAtNativeFold(s,7),null);
});
test('synthetic properties are ignored when checking section body',()=>{
 const s=headingSections([{from:0,to:0,synthetic:true,tokens:[]},head(0,3,1)],3);assert.equal(s.length,1);assert.equal(s[0].hasBody,false);
});
