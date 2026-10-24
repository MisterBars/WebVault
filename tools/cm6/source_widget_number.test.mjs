import test from 'node:test';
import assert from 'node:assert/strict';
import {widgetSourceNumber} from './source_widget_number.js';
import {parseDocument} from './markdown_renderer.js';
test('only root HR receives explicit empty number',()=>{
 const cases=[
  [{tokens:[{type:'hr'}]},''],
  [{tokens:[{type:'paragraph_open'},{type:'text',content:'---'}]},168],
  [{tokens:[{type:'heading_open',markup:'-'}]},168],
  [{tokens:[{type:'fence',content:'---'}]},168],
  [{tokens:[{type:'code_block',content:'---'}]},168],
  [{synthetic:true,tokens:[]},null],
  [null,168],
  [{tokens:[{type:'blockquote_open'},{type:'hr'}]},168],
  [{tokens:[{type:'wv_properties'}]},168]
 ];for(const [block,want] of cases)assert.equal(widgetSourceNumber(block,168),want);
});
test('all parsed rule spellings suppress only their own displayed number',()=>{
 for(const rule of ['---','***','___','* * *']){const doc=parseDocument('before\n\n'+rule+'\n\nafter'),blocks=doc.blocks;assert.deepEqual(blocks.map((b,i)=>widgetSourceNumber(b,i+1)),[1,'',3],rule);assert.deepEqual(blocks.map(b=>b.map),[[0,1],[2,3],[4,5]],rule);}
});
test('Setext heading is not mistaken for HR',()=>{const block=parseDocument('Title\n---').blocks[0];assert.equal(block.tokens[0].type,'heading_open');assert.equal(widgetSourceNumber(block,168),168);});
