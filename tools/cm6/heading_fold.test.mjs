import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState,StateField,StateEffect,Transaction} from '@codemirror/state';
import {basicSetup} from 'codemirror';
import {undoDepth,history,undo,redo} from '@codemirror/commands';
import {foldEffect,foldedRanges} from '@codemirror/language';
import {parseDocument} from './markdown_renderer.js';
import {createHeadingFolds} from './heading_fold_state.js';
const mode=StateEffect.define();
function fixture(doc='# A\n\nbody\n\n## Child\n\nchild body\n\n# B\n\nother'){
 const live=StateField.define({create:()=>true,update:(v,tr)=>{for(const e of tr.effects)if(e.is(mode))v=e.value;return v;}});
 function blocks(state){return parseDocument(state.doc.toString()).blocks.map(b=>({from:state.doc.line(b.map[0]+1).from,to:state.doc.line(Math.min(b.map[1],state.doc.lines)).to,tokens:b.tokens}));}
 const parsed=StateField.define({create:blocks,update:(v,tr)=>tr.docChanged?blocks(tr.state):v});
 const folds=createHeadingFolds({getBlocks:s=>s.field(parsed),isLive:s=>s.field(live)});
 let state=EditorState.create({doc,extensions:[basicSetup,live,parsed,folds.field,folds.nativeBridge]});
 const view={get state(){return state;},dispatch(spec){state=spec instanceof Transaction?spec.state:state.update(spec).state;}};
 return {view,folds};
}
test('view-only toggle preserves document and history',()=>{
 const {view,folds}=fixture(),before=view.state.doc.toString();folds.toggle(view,0,view.state.doc);
 assert.equal(view.state.doc.toString(),before);assert.equal(undoDepth(view.state),0);assert.deepEqual(view.state.field(folds.field).anchors,[0]);
});
test('expansion pins formatted heading until explicit editing reveal',()=>{
 const {view,folds}=fixture();folds.toggle(view,0,view.state.doc);folds.toggle(view,0,view.state.doc);
 assert.deepEqual(view.state.field(folds.field).anchors,[]);assert.equal(folds.isPinned(view.state,0),true);
 folds.toggle(view,0,view.state.doc,true);assert.equal(folds.isPinned(view.state,0),false);
});
test('heading anchors follow insertion above and do not move to deleted neighbour',()=>{
 const {view,folds}=fixture();folds.toggle(view,0,view.state.doc);view.dispatch({changes:{from:0,insert:'Intro\n\n'}});assert.ok(view.state.field(folds.field).anchors.includes(7));
 const next=folds.sections(view.state).find(s=>s.level===1&&s.from>7).from;
 view.dispatch({changes:{from:7,to:next}});assert.deepEqual(view.state.field(folds.field).anchors,[]);
});
test('native heading fold in live becomes a rendered fold without native overlap',()=>{
 const {view,folds}=fixture(),section=folds.sections(view.state)[0];view.dispatch({effects:foldEffect.of({from:view.state.doc.lineAt(section.from).to,to:section.to})});
 assert.deepEqual(view.state.field(folds.field).anchors,[0]);assert.equal(foldedRanges(view.state).size,0);
});
test('mode-like transitions preserve heading state and restore native source folds',()=>{
 const {view,folds}=fixture();folds.toggle(view,0,view.state.doc);
 view.dispatch({effects:[mode.of(false),...folds.nativeModeEffects(view.state,true)],annotations:folds.preserve.of(true)});assert.ok(foldedRanges(view.state).size>0);
 view.dispatch({effects:[mode.of(true),...folds.nativeModeEffects(view.state,false)],annotations:folds.preserve.of(true)});assert.equal(foldedRanges(view.state).size,0);assert.deepEqual(view.state.field(folds.field).anchors,[0]);
});
test('nested flags survive hiding and expanding parent',()=>{
 const {view,folds}=fixture(),child=folds.sections(view.state).find(s=>s.level===2).from;folds.toggle(view,child,view.state.doc);folds.toggle(view,0,view.state.doc);assert.deepEqual(folds.visible(view.state).map(s=>s.from),[0]);folds.toggle(view,0,view.state.doc);assert.deepEqual(folds.visible(view.state).map(s=>s.from),[child]);
});

test('native live collapse parks cursor outside hidden content',()=>{
 const {view,folds}=fixture();view.dispatch({selection:{anchor:2}});const section=folds.sections(view.state)[0];view.dispatch({effects:foldEffect.of({from:view.state.doc.lineAt(section.from).to,to:section.to})});assert.equal(view.state.selection.main.head,0);assert.deepEqual(view.state.field(folds.field).anchors,[0]);
});


// native-fold-rewrite-11b regressions

import {Annotation as FoldRegressionAnnotation} from '@codemirror/state';
test('rewriting native heading fold preserves unrelated effects and annotations',()=>{
 const {view,folds}=fixture(),annotation=FoldRegressionAnnotation.define(),side=StateEffect.define();
 const audit=StateField.define({create:()=>null,update:(value,tr)=>({tag:tr.annotation(annotation),side:tr.effects.some(e=>e.is(side)&&e.value==='keep-side'),nativeHeading:tr.effects.some(e=>e.is(foldEffect)&&e.value.from===3)})});
 view.dispatch({effects:StateEffect.appendConfig.of(audit)});
 const section=folds.sections(view.state)[0];
 view.dispatch({effects:[side.of('keep-side'),foldEffect.of({from:3,to:section.to})],annotations:annotation.of('keep-annotation')});
 assert.deepEqual(view.state.field(audit),{tag:'keep-annotation',side:true,nativeHeading:false});
 assert.equal(foldedRanges(view.state).size,0);assert.deepEqual(view.state.field(folds.field).anchors,[0]);
});
test('unrelated native code fold is not rewritten',()=>{
 const {view,folds}=fixture('# A\n\n```text\none\ntwo\n```\n');
 view.dispatch({effects:foldEffect.of({from:view.state.doc.line(3).to,to:view.state.doc.line(6).to})});
 assert.equal(foldedRanges(view.state).size,1);assert.deepEqual(view.state.field(folds.field).anchors,[]);
});
test('folding heading clears a preexisting native child code replacement',()=>{
 const {view,folds}=fixture('# A\n\n```text\none\ntwo\n```\n');
 view.dispatch({effects:foldEffect.of({from:view.state.doc.line(3).to,to:view.state.doc.line(6).to})});
 assert.equal(foldedRanges(view.state).size,1);
 const section=folds.sections(view.state)[0];view.dispatch({effects:foldEffect.of({from:3,to:section.to})});
 assert.equal(foldedRanges(view.state).size,0);assert.deepEqual(view.state.field(folds.field).anchors,[0]);
});
test('rewriting fold effects does not discard simultaneous text changes or history',()=>{
 const {view,folds}=fixture(),section=folds.sections(view.state)[0],end=view.state.doc.length;
 view.dispatch({changes:{from:end,insert:' changed'},effects:foldEffect.of({from:3,to:section.to}),annotations:Transaction.userEvent.of('input.test')});
 assert.ok(view.state.doc.toString().endsWith('other changed'));
 assert.equal(undoDepth(view.state),1);assert.equal(foldedRanges(view.state).size,0);assert.deepEqual(view.state.field(folds.field).anchors,[0]);
});
