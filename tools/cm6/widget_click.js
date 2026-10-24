export function revealAtPoint(view,block,point,isCurrent=()=>true){
 const expected=view.state.doc;
 if(!isCurrent()||!Number.isInteger(block.from)||!Number.isInteger(block.to)||block.from<0||block.to<block.from||block.to>expected.length||!Number.isFinite(point.x)||!Number.isFinite(point.y))return false;
 view.dispatch({selection:{anchor:block.from},scrollIntoView:false});view.focus();
 const selection=view.state.selection;
 const valid=()=>isCurrent()&&view.state.doc===expected&&view.state.selection===selection;
 view.requestMeasure({read:()=>{if(!valid())return null;const pos=view.posAtCoords(point,false);return Number.isInteger(pos)?Math.max(block.from,Math.min(block.to,pos)):null;},write:pos=>{if(pos===null||!valid())return;if(pos!==block.from)view.dispatch({selection:{anchor:pos},scrollIntoView:false});}});
 return true;
}
