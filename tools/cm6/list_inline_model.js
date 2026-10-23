import {taskForLine} from './task_model.js';
export function selectionTouches(ranges,from,to){return ranges.some(r=>r.empty?r.head>=from&&r.head<=to:r.from<to&&r.to>from);}
export function inlineListRows(text,block){
 if(!block||!['bullet_list_open','ordered_list_open'].includes(block.tokens?.[0]?.type))return null;
 const lines=text.split('\n'),starts=[];let pos=0;for(const line of lines){starts.push(pos);pos+=line.length+1;}
 const rows=[];
 for(const item of block.tokens){
  if(item.type!=='list_item_open'||!item.map)continue;
  const n=item.map[0],line=(lines[n]||'').replace(/\r$/,''),start=starts[n],m=/^([ \t]*)([-+*]|[0-9]{1,9}[.)])([ \t]+)/.exec(line);if(!m)continue;
  const from=start+m[1].length,to=start+m[0].length,task=taskForLine(line,start);
  rows.push({from,to,label:task?'':/^[0-9]/.test(m[2])?m[2]+' ':'• ',links:[],task});
 }
 for(const token of block.tokens){
  if(token.type!=='inline'||!token.map||(token.children||[]).some(t=>['code_inline','link_open','image','html_inline'].includes(t.type)))continue;
  const wanted=(token.children||[]).filter(t=>t.type==='wv_wiki').map(t=>({target:t.meta.target,label:t.content}));
  for(let n=token.map[0];n<token.map[1];n++){
   const rawLine=(lines[n]||'').replace(/\r$/,''),task=taskForLine(rawLine,starts[n]),line=task?.stamp&&!task.invalid?rawLine.slice(0,task.stamp.from-starts[n]):rawLine;if(/\\|`|%%|<!--/.test(line))continue;
   const row=rows.find(r=>r.from>=starts[n]&&r.from<starts[n]+line.length);if(!row)continue;
   const regex=/\[\[([^\r\n]*?)\]\]/g;let m;
   while((m=regex.exec(line))){
    if(line[m.index-1]==='!')continue;
    const pipe=m[1].indexOf('|'),target=(pipe<0?m[1]:m[1].slice(0,pipe)).trim(),label=pipe<0?m[1]:m[1].slice(pipe+1),index=wanted.findIndex(t=>t.target===target&&t.label===label);
    if(index<0)continue;wanted.splice(index,1);row.links.push({from:starts[n]+m.index,to:starts[n]+m.index+m[0].length,target,label});
   }
  }
 }
 // Every parsed list stays line-editable, even when an individual part is unsupported.
 return rows;
}
