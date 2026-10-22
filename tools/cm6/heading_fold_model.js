export function headingSections(blocks,length){
 const result=[],stack=[];
 for(const block of blocks){
  const token=block.tokens&&block.tokens[0];
  if(!token||token.type!=='heading_open')continue;
  const level=Number(String(token.tag).slice(1));if(level<1||level>6)continue;
  while(stack.length&&stack[stack.length-1].level>=level){const section=stack.pop();section.to=Math.max(section.headerTo,block.from-1);}
  const inline=block.tokens.find(t=>t.type==='inline');
  const section={from:block.from,headerTo:block.to,to:length,level,label:inline&&inline.content||'Заголовок',block,hasBody:false};
  result.push(section);stack.push(section);
 }
 for(const section of result)section.hasBody=blocks.some(b=>!b.synthetic&&b.from>section.headerTo&&b.from<section.to&&b.to>b.from);
 return result;
}
export function visibleCollapsed(sections,anchors){
 const set=new Set(anchors),result=[];
 for(const section of sections){
  if(!section.hasBody||!set.has(section.from))continue;
  if(result.length&&section.from<=result[result.length-1].to)continue;
  result.push(section);
 }
 return result;
}
export function sectionAtNativeFold(sections,from){return sections.find(s=>s.hasBody&&from>=s.from&&from<=s.headerTo)||null;}
