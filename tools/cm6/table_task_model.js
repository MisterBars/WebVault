import {taskForLine} from './task_model.js';
export function tableTaskForCell(cell){
 const parsed=taskForLine('- '+cell.value);if(!parsed)return null;
 const offset=cell.from-2;
 return {kind:'table-cell',cellFrom:cell.from,cellTo:cell.to,cellValue:cell.value,from:parsed.from+offset,to:parsed.to+offset,symbol:parsed.symbol,checked:parsed.checked,invalid:parsed.invalid,stamp:parsed.stamp?{...parsed.stamp,from:parsed.stamp.from+offset,to:parsed.stamp.to+offset}:null};
}
export function toggleTableTaskChanges(text,task,now=new Date()){
 if(task.kind!=='table-cell'||task.invalid||text.slice(task.cellFrom,task.cellTo)!==task.cellValue)throw new Error('Ячейка изменилась или отметка времени некорректна.');
 const fresh=tableTaskForCell({from:task.cellFrom,to:task.cellTo,value:task.cellValue});if(!fresh||fresh.invalid||fresh.from!==task.from||fresh.to!==task.to||fresh.symbol!==task.symbol)throw new Error('Не удалось проверить checkbox ячейки.');
 const checked=!task.checked,insert=task.symbol.length===1?(checked?'☑':'☐'):(checked?'[x]':'[ ]'),suffix=checked?' <!--wv-task:'+now.toISOString()+'-->':'';
 const changes=[{from:task.from,to:task.to,insert},{from:task.stamp?task.stamp.from:task.cellTo,to:task.cellTo,insert:suffix}];
 if(changes.some(c=>c.from<task.cellFrom||c.to>task.cellTo||c.to<c.from))throw new Error('Операция выходит за границы ячейки.');
 if(text.length+changes.reduce((n,c)=>n+c.insert.length-(c.to-c.from),0)>131072)throw new Error('Заметка превышает лимит редактора.');return changes;
}
