import {markdown} from '@codemirror/lang-markdown';
import {foldNodeProp} from '@codemirror/language';
import {footnoteSyntax} from './source_footnotes.js';
const highlight={resolve:'WVHighlight',mark:'WVHighlightMark'},strike={resolve:'WVStrike',mark:'WVStrikeMark'};
function paired(name,char,delimiter){return {name,after:'Emphasis',parse(cx,next,pos){if(next!==char||cx.char(pos+1)!==char||cx.char(pos+2)===char||cx.char(pos-1)===char)return -1;const before=cx.slice(pos-1,pos),after=cx.slice(pos+2,pos+3);return cx.addDelimiter(delimiter,pos,pos+2,!/\s|^$/.test(after),!/\s|^$/.test(before));}};}
export function createSourceMarkdown(findFrontmatter,{footnotes=false}={}){
 return markdown({extensions:[{
  defineNodes:[{name:'WVFrontmatter',block:true},'WVHighlight','WVHighlightMark','WVStrike','WVStrikeMark'],
  parseInline:[paired('WVHighlight',61,highlight),paired('WVStrike',126,strike)],
  props:[foldNodeProp.add({WVFrontmatter:()=>null})],
  parseBlock:[{name:'WVFrontmatter',before:'HorizontalRule',parse(cx,line){
   if(cx.lineStart!==0||cx.parentType().name!=='Document')return false;
   const text=cx.input.read(0,cx.input.length),front=findFrontmatter(text);if(!front)return false;
   while(cx.lineStart<front.bodyEnd){if(!cx.nextLine())break;}
   const last=text.charCodeAt(front.end-1)===10?(text.charCodeAt(front.end-2)===13?2:1):0;
   cx.addElement(cx.elt('WVFrontmatter',0,front.end-last));
   cx.nextLine();return true;
  }}]
 },...(footnotes?[footnoteSyntax]:[])]});
}
