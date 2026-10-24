import {parseTable} from './table_model.js';
function records(source){let at=0;const rows=[];while(at<source.length){const newline=source.indexOf('\n',at),next=newline<0?source.length:newline+1,end=newline<0?source.length:newline>at&&source[newline-1]==='\r'?newline-1:newline,text=source.slice(at,end);if(!text.trim())break;rows.push({text,eol:source.slice(end,next)});at=next;}return {rows,tail:source.slice(at)};}
function segments(line){const cuts=[];for(let i=0;i<line.length;i++)if(line[i]==='|'){let n=0;for(let j=i-1;j>=0&&line[j]==='\\';j--)n++;if(!(n%2))cuts.push(i);}const bounds=[-1,...cuts,line.length],cells=[];for(let i=0;i<bounds.length-1;i++)cells.push(line.slice(bounds[i]+1,bounds[i+1]));let prefix='',suffix='';if(cuts.length&&!cells[0].trim())prefix=cells.shift()+'|';if(cuts.length&&!cells[cells.length-1].trim())suffix='|'+cells.pop();return {cells,prefix,suffix};}
function format(row){let {cells,prefix,suffix}=row;if(!prefix&&(!cells[0].trim()||cells.length===1))prefix='|';if(!suffix&&(!cells[cells.length-1].trim()||cells.length===1))suffix='|';return prefix+cells.join('|')+suffix;}
function moved(list,from,to){const result=list.slice(),[item]=result.splice(from,1);result.splice(to,0,item);return result;}
function index(value,length){if(!Number.isInteger(value)||value<0||value>=length)throw new Error('Недопустимый индекс строки/столбца.');}
export function tableStructureChange(text,table,op){
 if(text.slice(table.from,table.to)!==table.source)throw new Error('Таблица изменилась. Повторите действие.');
 const {rows,tail}=records(table.source),values=table.rows.map(row=>row.map(c=>c.value));let align=table.alignment.slice(),focusRow=0,focusColumn=0;
 if(rows.length!==table.rows.length+1)throw new Error('Неоднозначные границы строк таблицы.');
 if(op.kind==='add-row'){
  if(values.length-1>=200)throw new Error('Лимит 200 строк данных.');
  const eol=rows.find(r=>r.eol)?.eol||'\n',last=rows[rows.length-1],ending=last.eol;last.eol=eol;rows.push({text:'|'+Array(table.width).fill('  ').join('|')+'|',eol:ending});focusRow=values.length;values.push(Array(table.width).fill(''));
 }else if(op.kind==='add-column'){
  if(table.width>=50)throw new Error('Лимит 50 столбцов.');
  rows.forEach((row,i)=>{const s=segments(row.text);s.cells.push(i===1?' --- ':'  ');row.text=format(s);});focusColumn=table.width;values.forEach(row=>row.push(''));align.push('---');
 }else if(op.kind==='move-row'){
  index(op.from,values.length-1);index(op.to,values.length-1);if(op.from===op.to)return null;
  const data=moved(rows.slice(2).map(r=>r.text),op.from,op.to);data.forEach((value,i)=>{rows[i+2].text=value;});const result=moved(values.slice(1),op.from,op.to);values.splice(1,values.length-1,...result);focusRow=op.to+1;
 }else if(op.kind==='move-column'){
  index(op.from,table.width);index(op.to,table.width);if(op.from===op.to)return null;
  rows.forEach(row=>{const s=segments(row.text);s.cells=moved(s.cells,op.from,op.to);row.text=format(s);});values.forEach((row,i)=>{values[i]=moved(row,op.from,op.to);});align=moved(align,op.from,op.to);focusColumn=op.to;
 }else if(op.kind==='delete-row'){
  index(op.index,values.length-1);const slot=op.index+2,last=rows.length-1,ending=rows[last].eol;rows.splice(slot,1);if(slot===last)rows[rows.length-1].eol=ending;values.splice(op.index+1,1);focusRow=Math.min(op.index+1,values.length-1);
 }else if(op.kind==='delete-column'){
  index(op.index,table.width);if(table.width===1)throw new Error('Последний столбец удаляется командой «Удалить таблицу».');
  rows.forEach(row=>{const s=segments(row.text);s.cells.splice(op.index,1);row.text=format(s);});values.forEach(row=>row.splice(op.index,1));align.splice(op.index,1);focusColumn=Math.min(op.index,table.width-2);
 }else throw new Error('Неизвестная операция таблицы.');
 const insert=rows.map(r=>r.text+r.eol).join('')+tail,next=text.slice(0,table.from)+insert+text.slice(table.to);if(next.length>131072)throw new Error('Заметка превышает лимит редактора.');
 const checked=parseTable(next,table.from,table.from+insert.length);if(JSON.stringify(checked.rows.map(row=>row.map(c=>c.value)))!==JSON.stringify(values)||JSON.stringify(checked.alignment)!==JSON.stringify(align))throw new Error('Операция нарушает структуру/содержимое таблицы.');
 return {change:{from:table.from,to:table.to,insert},focusRow,focusColumn};
}
export function dropMoveIndex(from,target,after,length){index(from,length);index(target,length);const boundary=target+(after?1:0);return boundary-(from<boundary?1:0);}
