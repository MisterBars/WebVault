import {parseTable} from './table_model.js';
export function tableRemovalChange(text,table){
 if(text.slice(table.from,table.to)!==table.source)throw new Error('Таблица изменилась. Откройте удаление заново.');
 parseTable(text,table.from,table.to);
 const lines=table.source.split('\n');while(lines.length&&!lines[lines.length-1].trim())lines.pop();
 let to=table.from+lines.join('\n').length;
 if(text.slice(to,to+2)==='\r\n')to+=2;else if(text[to]==='\n')to++;
 if(!Number.isInteger(table.from)||table.from<0||to<=table.from||to>text.length)throw new Error('Не удалось проверить границы таблицы.');
 return {from:table.from,to,insert:''};
}
