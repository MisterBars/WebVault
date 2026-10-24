import {parseTable,splitTableRow} from './table_model.js';
export const TABLE_ALIGNMENTS=[['default','По умолчанию'],['left','Слева'],['center','По центру'],['right','Справа']];
export function tableAlignment(value){return value.startsWith(':')?(value.endsWith(':')?'center':'left'):(value.endsWith(':')?'right':'default');}
export function tableAlignmentChange(text,table,column,alignment){
 if(!TABLE_ALIGNMENTS.some(([key])=>key===alignment)||!Number.isInteger(column)||column<0||column>=table.width)throw new Error('Недопустимое выравнивание или столбец.');
 if(text.slice(table.from,table.to)!==table.source)throw new Error('Таблица изменилась. Откройте меню заново.');
 const start=text.indexOf('\n',table.from)+1,end=text.indexOf('\n',start),line=text.slice(start,end<0?table.to:Math.min(end,table.to)).replace(/\r$/,''),cell=splitTableRow(line,start)[column];
 const dashes=cell.value.replace(/:/g,''),insert=(['left','center'].includes(alignment)?':':'')+dashes+(['right','center'].includes(alignment)?':':'');if(insert===cell.value)return null;
 const change={from:cell.from,to:cell.to,insert},next=text.slice(0,change.from)+insert+text.slice(change.to);if(next.length>131072)throw new Error('Заметка превышает лимит редактора.');
 const checked=parseTable(next,table.from,table.to+insert.length-(change.to-change.from));if(checked.width!==table.width||checked.rows.length!==table.rows.length||checked.alignment.some((v,i)=>i!==column&&v!==table.alignment[i]))throw new Error('Изменение затрагивает другие столбцы.');return change;
}
