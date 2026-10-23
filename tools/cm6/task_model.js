export function taskForLine(line,start=0){
 const m=/^([ \t]*(?:[-+*]|[0-9]{1,9}[.)])[ \t]+)(\[[ xX]\]|[☐☑])(?=[ \t]|$)/.exec(line);if(!m)return null;
 const from=start+m[1].length,to=from+m[2].length,match=/ (<!--wv-task:([^<>]+)-->)[ \t]*$/.exec(line);
 let stamp=null,invalid=false;
 if(match){const iso=match[2],date=new Date(iso);invalid=!Number.isFinite(date.getTime())||date.toISOString()!==iso;stamp={from:start+match.index,to:start+line.length,raw:match[0],iso};}
 if(line.includes('<!--wv-task:')&&(!stamp||line.indexOf('<!--wv-task:')!==line.lastIndexOf('<!--wv-task:')))invalid=true;
 return {from,to,checked:m[2]==='☑'||/^\[[xX]\]$/.test(m[2]),symbol:m[2],lineStart:start,lineEnd:start+line.length,line,stamp,invalid};
}
export function toggleTaskChanges(text,task,now=new Date()){
 if(task.invalid||text.slice(task.lineStart,task.lineEnd)!==task.line)throw new Error('Задача изменилась или содержит некорректную отметку времени.');
 const fresh=taskForLine(task.line,task.lineStart);if(!fresh||fresh.from!==task.from||fresh.symbol!==task.symbol)throw new Error('Не удалось проверить задачу.');
 const checked=!task.checked,insert=task.symbol.length===1?(checked?'☑':'☐'):(checked?'[x]':'[ ]');
 const suffix=checked?' <!--wv-task:'+now.toISOString()+'-->':'';
 const changes=[{from:task.from,to:task.to,insert},{from:task.stamp?task.stamp.from:task.lineEnd,to:task.lineEnd,insert:suffix}];
 const length=text.length+changes.reduce((n,c)=>n+c.insert.length-(c.to-c.from),0);if(length>131072)throw new Error('Заметка превышает лимит редактора.');return changes;
}
export function localTaskTime(iso){return new Date(iso).toLocaleString(undefined,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
