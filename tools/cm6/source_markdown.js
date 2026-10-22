import {markdown} from '@codemirror/lang-markdown';
import {foldNodeProp} from '@codemirror/language';
export function createSourceMarkdown(findFrontmatter){
 return markdown({extensions:{
  defineNodes:[{name:'WVFrontmatter',block:true}],
  props:[foldNodeProp.add({WVFrontmatter:()=>null})],
  parseBlock:[{name:'WVFrontmatter',before:'HorizontalRule',parse(cx,line){
   if(cx.lineStart!==0||cx.parentType().name!=='Document')return false;
   const text=cx.input.read(0,cx.input.length),front=findFrontmatter(text);if(!front)return false;
   while(cx.lineStart<front.bodyEnd){if(!cx.nextLine())break;}
   const last=text.charCodeAt(front.end-1)===10?(text.charCodeAt(front.end-2)===13?2:1):0;
   cx.addElement(cx.elt('WVFrontmatter',0,front.end-last));
   cx.nextLine();return true;
  }}]
 }});
}
