import {EditorView,ViewPlugin,Decoration} from '@codemirror/view';
import {syntaxTree} from '@codemirror/language';
import {unselectedParts} from './mark_highlight_model.js';
export function markDecorations(state,from=0,to=state.doc.length){
 const out=[];
 syntaxTree(state).iterate({from,to,enter(node){if(node.name!=='WVHighlight')return;for(const [a,b] of unselectedParts(node.from,node.to,state.selection.ranges))out.push(Decoration.mark({class:'wv-source-mark'}).range(a,b));}});
 return Decoration.set(out,true);
}
const plugin=ViewPlugin.fromClass(class{
 constructor(view){this.decorations=markDecorations(view.state,view.viewport.from,view.viewport.to);}
 update(update){if(update.docChanged||update.selectionSet||update.viewportChanged||update.transactions.length)this.decorations=markDecorations(update.state,update.view.viewport.from,update.view.viewport.to);}
},{decorations:value=>value.decorations});
export const markHighlight=[plugin,EditorView.baseTheme({'.wv-source-mark':{backgroundColor:'var(--text-highlight-bg,#7b682d)',color:'inherit'}})];
