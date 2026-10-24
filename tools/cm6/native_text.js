import {StateField} from '@codemirror/state';
import {EditorView,Decoration} from '@codemirror/view';
import {syntaxTree} from '@codemirror/language';
import {isNativeTextBlock,markerVisible,markerScope} from './native_text_model.js';
export {isNativeTextBlock} from './native_text_model.js';
export function createNativeText({isLive,getBlocks,getHidden}){
 const classes={StrongEmphasis:'wv-native-strong',Emphasis:'wv-native-em',Strikethrough:'wv-native-strike',WVStrike:'wv-native-strike',InlineCode:'wv-native-code',WVHighlight:'wv-native-highlight'};
 const markers=new Set(['EmphasisMark','StrikethroughMark','WVStrikeMark','CodeMark','CodeInfo','WVHighlightMark']);
 const scopes=new Set([...Object.keys(classes),'FencedCode']);
 function build(state){
  if(!isLive(state))return Decoration.none;
  const hidden=getHidden(state),blocks=getBlocks(state).filter(b=>isNativeTextBlock(b)&&!hidden.some(s=>b.from>s.from&&b.from<=s.to)),out=[];
  const allowed=(from,to)=>blocks.some(b=>from>=b.from&&to<=b.to);
  syntaxTree(state).iterate({enter(node){
   if(!allowed(node.from,node.to))return;
   const cls=classes[node.name];if(cls&&node.to>node.from)out.push(Decoration.mark({class:cls}).range(node.from,node.to));
   if(markers.has(node.name)&&node.to>node.from){const scope=markerScope(node.node,scopes);if(!markerVisible(state.selection.ranges,scope.from,scope.to))out.push(Decoration.replace({inclusive:false}).range(node.from,node.to));}
  }});
  for(const b of blocks)if(['fence','code_block'].includes(b.tokens[0].type))for(let n=state.doc.lineAt(b.from).number,last=state.doc.lineAt(b.to).number;n<=last;n++)out.push(Decoration.line({class:'wv-native-code-line'}).range(state.doc.line(n).from));
  return Decoration.set(out,true);
 }
 const field=StateField.define({create:build,update:(value,tr)=>tr.docChanged||tr.selection||tr.effects.length?build(tr.state):value,provide:f=>EditorView.decorations.from(f)});
 const style=EditorView.baseTheme({'.wv-native-strong':{fontWeight:'bold'},'.wv-native-em':{fontStyle:'italic'},'.wv-native-strike':{textDecoration:'line-through'},'.wv-native-code':{fontFamily:'var(--font-monospace,monospace)',backgroundColor:'var(--background-secondary)'},'.wv-native-highlight':{backgroundColor:'var(--text-highlight-bg,#7b682d)',color:'inherit'},'.wv-native-code-line':{fontFamily:'var(--font-monospace,monospace)',backgroundColor:'var(--background-secondary)'}});
 if(typeof window!=='undefined')window.__WV_NATIVE_TEXT_REVEAL_TEST='native-reveal-19e';
 return {field,extension:[field,style]};
}
