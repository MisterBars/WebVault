import {StateField,StateEffect,Annotation,EditorState,Transaction} from '@codemirror/state';
import {foldEffect,unfoldEffect,foldedRanges} from '@codemirror/language';
import {headingSections,visibleCollapsed,sectionAtNativeFold} from './heading_fold_model.js';
export function createHeadingFolds({getBlocks,isLive}){
 const cache=new WeakMap();
 function sections(state){const blocks=getBlocks(state);if(!cache.has(blocks))cache.set(blocks,headingSections(blocks,state.doc.length));return cache.get(blocks);}
 const effect=StateEffect.define({map:(value,mapping)=>({...value,from:mapping.mapPos(value.from,1)})});
 const preserve=Annotation.define();
 const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
 const sorted=set=>[...set].sort((a,b)=>a-b);
 function remap(values,tr,valid){
  return new Set(values.flatMap(pos=>{
   let deleted=false;
   if(tr.docChanged)tr.changes.iterChangedRanges((from,to,newFrom,newTo)=>{if(newFrom===newTo&&from<=pos&&to>pos)deleted=true;});
   const next=tr.docChanged?tr.changes.mapPos(pos,1):pos;
   return !deleted&&valid.has(next)?[next]:[];
  }));
 }
 const field=StateField.define({
  create:()=>({anchors:[],pinned:[]}),
  update:(value,tr)=>{
   const all=sections(tr.state),valid=new Set(all.filter(s=>s.hasBody).map(s=>s.from));
   const anchors=remap(value.anchors,tr,valid),pinned=remap(value.pinned,tr,valid);
   const foldAction=tr.effects.some(e=>e.is(effect)||e.is(foldEffect)||e.is(unfoldEffect));
   if(!tr.annotation(preserve)&&!foldAction&&(tr.selection||tr.docChanged&&tr.isUserEvent('input')&&!tr.isUserEvent('input.properties')))pinned.clear();
   for(const e of tr.effects){
    if(e.is(effect)){
     if(!valid.has(e.value.from))continue;
     if(e.value.folded)anchors.add(e.value.from);else anchors.delete(e.value.from);
     if(e.value.editing)pinned.delete(e.value.from);else pinned.add(e.value.from);
    }else if(!tr.annotation(preserve)&&(e.is(foldEffect)||e.is(unfoldEffect))){
     const section=sectionAtNativeFold(all,e.value.from);
     if(section){if(e.is(foldEffect))anchors.add(section.from);else anchors.delete(section.from);}
    }
   }
   if(tr.selection&&!foldAction&&!tr.annotation(preserve))for(const section of all){
    const start=tr.state.doc.lineAt(section.from).to;
    if(tr.state.selection.ranges.some(r=>r.empty?r.head>start&&r.head<section.to:r.to>start&&r.from<section.to))anchors.delete(section.from);
   }
   const next={anchors:sorted(anchors),pinned:sorted(pinned)};
   return equal(value.anchors,next.anchors)&&equal(value.pinned,next.pinned)?value:next;
  }
 });
 function visible(state){return visibleCollapsed(sections(state),state.field(field).anchors);}
 function nativeModeEffects(state,source){
  const effects=[];foldedRanges(state).between(0,state.doc.length,(from,to)=>effects.push(unfoldEffect.of({from,to})));
  if(source)for(const section of sections(state))if(state.field(field).anchors.includes(section.from)&&section.hasBody){const from=state.doc.lineAt(section.from).to;if(from<section.to)effects.push(foldEffect.of({from,to:section.to}));}
  return effects;
 }
 // native-fold-rewrite-11b: replace the heading fold effect before final state.
 const nativeBridge=EditorState.transactionFilter.of(tr=>{
  if(tr.annotation(preserve)||!isLive(tr.startState))return tr;
  const all=sections(tr.state),effects=[],cleanup=new Set();
  let rewritten=false,selection=tr.selection;
  function clearNative(range){
   const key=range.from+':'+range.to;
   if(!cleanup.has(key)){effects.push(unfoldEffect.of(range));cleanup.add(key);}
  }
  for(const e of tr.effects){
   if(e.is(foldEffect)||e.is(unfoldEffect)){
    const section=sectionAtNativeFold(all,e.value.from);
    if(section){
     rewritten=true;
     effects.push(effect.of({from:section.from,folded:e.is(foldEffect)}));
     clearNative(e.value);
     if(e.is(foldEffect)){
      if(tr.newSelection.ranges.some(r=>r.head>section.from&&r.head<section.to))selection={anchor:section.from};
      foldedRanges(tr.startState).between(0,tr.startState.doc.length,(from,to)=>{
       const mapped=unfoldEffect.of({from,to}).map(tr.changes);
       if(mapped&&mapped.value.from>=section.from&&mapped.value.to<=section.to)clearNative(mapped.value);
      });
     }
     continue;
    }
   }
   effects.push(e);
  }
  // Rebuild the spec instead of leaving the original heading foldEffect in it.
  // Preserve changes, original annotations, selection/scroll intent and unrelated effects.
  return rewritten?{...tr,effects,selection,annotations:[...tr.annotations,preserve.of(true)]}:tr;
 });

 function toggle(view,from,expectedDoc,editing=false){
  if(view.state.doc!==expectedDoc)return false;
  const section=sections(view.state).find(s=>s.from===from&&s.hasBody);if(!section)return false;
  const folded=editing?false:!view.state.field(field).anchors.includes(from);
  const effects=[effect.of({from,folded,editing})];
  foldedRanges(view.state).between(section.from,section.to,(a,b)=>effects.push(unfoldEffect.of({from:a,to:b})));
  const selection=editing||folded&&view.state.selection.ranges.some(r=>r.head>section.from&&r.head<section.to)?{anchor:section.from}:undefined;
  view.dispatch({effects,annotations:[preserve.of(true),Transaction.addToHistory.of(false)],...(selection?{selection}:{}),scrollIntoView:editing});
  return true;
 }
 return {field,effect,preserve,sections,visible,nativeBridge,nativeModeEffects,toggle,isPinned:(state,from)=>state.field(field).pinned.includes(from)};
}
