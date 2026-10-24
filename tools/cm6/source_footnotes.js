import {footnoteDefinitionHead,readFootnoteDefinition,readNamedFootnote,readInlineFootnote} from './footnote_syntax.js';
import {resolveFootnotes} from './footnote_model.js';
function rootHead(cx,line){return cx.parentType().name==='Document'&&(cx.lineStart===0||line.text.charCodeAt(0)!==0xfeff)&&footnoteDefinitionHead(line.text);}
export const footnoteSyntax={
 defineNodes:[{name:'WVFootnoteDefinition',block:true},'WVFootnoteReference','WVInlineFootnote','WVFootnoteLabel','WVFootnoteBody','WVFootnoteMark'],
 parseBlock:[{name:'WVFootnoteDefinition',before:'LinkReference',endLeaf:(cx,line)=>!!rootHead(cx,line),parse(cx,line){
  if(!rootHead(cx,line))return false;
  const text=cx.input.read(0,cx.input.length),d=readFootnoteDefinition(text,cx.lineStart);if(!d)return false;
  while(cx.lineStart<d.lastLineFrom){if(!cx.nextLine())break;}
  const children=[cx.elt('WVFootnoteMark',d.markerFrom,d.labelFrom),cx.elt('WVFootnoteLabel',d.labelFrom,d.labelTo),cx.elt('WVFootnoteMark',d.labelTo,d.labelTo+2)];
  if(d.bodyFrom<d.to)children.push(cx.elt('WVFootnoteBody',d.bodyFrom,d.to));
  cx.addElement(cx.elt('WVFootnoteDefinition',d.from,d.to,children));cx.nextLine();return true;
 }}],
 parseInline:[{name:'WVFootnoteReference',before:'Link',parse(cx,next,pos){
  if(next!==91||cx.hasOpenLink||cx.char(pos-1)===33)return -1;
  const r=readNamedFootnote(cx.slice(pos,Math.min(cx.end,pos+132)));if(!r)return -1;
  const end=pos+r.to;return cx.addElement(cx.elt('WVFootnoteReference',pos,end,[cx.elt('WVFootnoteMark',pos,pos+2),cx.elt('WVFootnoteLabel',pos+2,end-1),cx.elt('WVFootnoteMark',end-1,end)]));
 }},{name:'WVInlineFootnote',before:'Link',parse(cx,next,pos){
  if(next!==94||cx.hasOpenLink)return -1;
  const r=readInlineFootnote(cx.slice(pos,Math.min(cx.end,pos+8192)));if(!r)return -1;
  const end=pos+r.to;return cx.addElement(cx.elt('WVInlineFootnote',pos,end,[cx.elt('WVFootnoteMark',pos,pos+2),cx.elt('WVFootnoteBody',pos+2,end-1),cx.elt('WVFootnoteMark',end-1,end)]));
 }}]
};
export function collectFootnoteSyntax(text,tree,limits={}){
 const definitions=[],references=[];
 tree.iterate({enter(node){
  if(['WVFrontmatter','FencedCode','CodeBlock','InlineCode','HTMLBlock','HTMLTag','Link','Image'].includes(node.name))return false;
  if(node.name==='WVFootnoteDefinition'){const d=readFootnoteDefinition(text,node.from);if(d&&d.to===node.to)definitions.push(d);return false;}
  if(node.name==='WVFootnoteReference'){const r=readNamedFootnote(text,node.from);if(r&&r.to===node.to)references.push(r);return false;}
  if(node.name==='WVInlineFootnote'){const r=readInlineFootnote(text,node.from);if(r&&r.to===node.to)references.push(r);return false;}
 }});
 return {...resolveFootnotes({...limits,definitions,references}),definitionSources:definitions};
}
