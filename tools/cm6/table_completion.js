import {EditorState} from '@codemirror/state';
import {ensureSyntaxTree} from '@codemirror/language';
import {Transaction} from '@codemirror/state';
import {isolateHistory} from '@codemirror/commands';
import {BASIC_TABLE} from './table_model.js';
import {focusTableCell} from './table_ui.js';
function command(state,pos){const line=state.doc.lineAt(pos);if(pos!==line.to||!/^\/(?:[a-z]*|[а-я]*)$/i.test(line.text))return null;const q=line.text.toLowerCase();if(!'/table'.startsWith(q)&&!'/таблица'.startsWith(q))return null;if(state.doc.line(1).text.trim()==='---'){let end=2;while(end<=state.doc.lines&&state.doc.line(end).text.trim()!=='---')end++;if(end>state.doc.lines||pos<=state.doc.line(end).to)return null;}const tree=ensureSyntaxTree(state,pos,50);if(!tree)return null;for(let n=tree.resolveInner(pos,-1);n;n=n.parent)if(/Code|Comment|WVFrontmatter|List|Blockquote/.test(n.name))return null;return line;}
export function createTableCompletion(getContext,message){
 const source=context=>{const owner=getContext(),line=command(context.state,context.pos);if(!owner.canWrite||!line||context.state.selection.ranges.length!==1||!context.state.selection.main.empty)return null;return {from:line.from,filter:false,options:[{label:'/table',displayLabel:'Создать таблицу 2×2',detail:'2 столбца, 2 строки данных и заголовок',apply(view){
  const now=getContext(),current=command(view.state,view.state.selection.main.head);if(!current||!now.canWrite||now.userId!==owner.userId||now.path!==owner.path||now.mode!==owner.mode)return;
  const before=current.number>1&&view.state.doc.line(current.number-1).text.trim()?'\n':'',after=current.number<view.state.doc.lines&&view.state.doc.line(current.number+1).text.trim()?'\n':'',insert=before+BASIC_TABLE+'\n'+after;
  if(view.state.doc.length-(current.to-current.from)+insert.length>131072){message('Заметка превышает лимит редактора.');return;}
  view.dispatch({changes:{from:current.from,to:current.to,insert},selection:{anchor:current.from+before.length+2},annotations:[Transaction.userEvent.of('input.complete'),isolateHistory.of('full')]});if(now.mode===1)queueMicrotask(()=>focusTableCell(view,current.from+before.length));
 }}]};};return {source,extension:EditorState.languageData.of(()=>[{autocomplete:source}])};
}
