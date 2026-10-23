import test from 'node:test';
import assert from 'node:assert/strict';
import {inlineListRows,selectionTouches} from './list_inline_model.js';
function block(text,children=[{type:'text'}]){return {from:0,to:text.length,tokens:[{type:'bullet_list_open'},{type:'inline',children},{type:'bullet_list_close'}]};}
test('independent marker ranges preserve text and indentation',()=>{const s='- first\n  - child\n- last',rows=inlineListRows(s,block(s));assert.deepEqual(rows.map(r=>s.slice(r.from,r.to)),['- ','- ','- ']);assert.equal(rows[1].from,10);});
test('ordered source numbers retained',()=>{const s='9. first\n10. next',rows=inlineListRows(s,block(s));assert.deepEqual(rows.map(r=>r.label),['9. ','10. ']);});
test('wiki caption and precise range',()=>{const s='- before [[/A.md|Моя подпись]] after',rows=inlineListRows(s,block(s,[{type:'text'},{type:'wv_wiki'}]));const link=rows[0].links[0];assert.equal(s.slice(link.from,link.to),'[[/A.md|Моя подпись]]');assert.equal(link.label,'Моя подпись');assert.equal(link.target,'/A.md');});
test('task rows retained by fallback',()=>{for(const s of ['- [ ] task','- [x] task','- ☑ task'])assert.equal(inlineListRows(s,block(s)),null);});
test('multiline paragraphs and code retained by fallback',()=>{for(const s of ['- first\n  continuation','- first\n\n- next','- `[[A]]`','- <!-- [[A]] -->','- %% [[A]] %%'])assert.equal(inlineListRows(s,block(s)),null);});
test('formatting, non-list and parser-disagreement retained by fallback',()=>{const s='- [[A]]';assert.equal(inlineListRows(s,block(s)),null);assert.equal(inlineListRows('- **bold**',block('- **bold**',[{type:'strong_open'}])),null);assert.equal(inlineListRows(s,{...block(s),tokens:[{type:'paragraph_open'}]}),null);});
test('cursor only reveals its own part',()=>{const r=[{empty:true,head:8}];assert.equal(selectionTouches(r,0,2),false);assert.equal(selectionTouches(r,6,12),true);});
test('selection crossing a part reveals it, adjacent selection does not',()=>{assert.equal(selectionTouches([{empty:false,from:3,to:10}],6,12),true);assert.equal(selectionTouches([{empty:false,from:0,to:6}],6,12),false);});
