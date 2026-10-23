const structural=new Set(['bullet_list_open','bullet_list_close','ordered_list_open','ordered_list_close','list_item_open','list_item_close','paragraph_open','paragraph_close','inline']);
export function inlineListRows(text,block){
 if(!block||!block.tokens||!['bullet_list_open','ordered_list_open'].includes(block.tokens[0]?.type))return null;
 if(block.tokens.some(t=>!structural.has(t.type)||t.type==='inline'&&(t.children||[]).some(c=>!['text','wv_wiki'].includes(c.type))))return null;
 const raw=text.slice(block.from,block.to);if(/[\\&`]|%%|<!--/.test(raw))return null;
 const rows=[];let start=block.from;
 for(const line of raw.split('\n')){
  const m=/^([ \t]*)([-+*]|[0-9]{1,9}[.)])([ \t]+)(.*?)(?:\r)?$/.exec(line);
  if(!m||!m[4]||/^(?:\[[ xX]\](?:[ \t]|$)|[☐☑])/.test(m[4]))return null;
  const from=start+m[1].length,to=from+m[2].length+m[3].length,links=[];
  const wiki=/\[\[([^\]\r\n]+)\]\]/g;let match;
  while((match=wiki.exec(m[4]))){
   if(m[4][match.index-1]==='!')return null;
   const pipe=match[1].indexOf('|'),target=(pipe<0?match[1]:match[1].slice(0,pipe)).trim(),label=pipe<0?match[1]:match[1].slice(pipe+1);
   if(!target)return null;links.push({from:to+match.index,to:to+match.index+match[0].length,target,label});
  }
  rows.push({from,to,label:/^[0-9]/.test(m[2])?m[2]+' ':'• ',links});start+=line.length+1;
 }
 const count=block.tokens.filter(t=>t.type==='inline').flatMap(t=>t.children||[]).filter(t=>t.type==='wv_wiki').length;
 return rows.reduce((n,r)=>n+r.links.length,0)===count?rows:null;
}
export function selectionTouches(ranges,from,to){return ranges.some(r=>r.empty?r.head>=from&&r.head<=to:r.from<to&&r.to>from);}
