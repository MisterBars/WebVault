export function splitTableRow(line,start=0){
 const cuts=[];for(let i=0;i<line.length;i++)if(line[i]==='|'){let n=0;for(let j=i-1;j>=0&&line[j]==='\\';j--)n++;if(n%2===0)cuts.push(i);}
 const bounds=[-1,...cuts,line.length],cells=[];
 for(let i=0;i<bounds.length-1;i++){const a=bounds[i]+1,b=bounds[i+1],raw=line.slice(a,b);if((i===0&&cuts.length&&raw.trim()==='')||(i===bounds.length-2&&cuts.length&&raw.trim()===''))continue;const left=raw.length-raw.trimStart().length,right=raw.length-raw.trimEnd().length,from=start+a+left;cells.push({from,to:Math.max(from,start+b-right),value:raw.trim()});}
 return cells;
}
export function parseTable(text,from,to){
 const source=text.slice(from,to),lines=source.split('\n');while(lines.length&& !lines[lines.length-1].trim())lines.pop();
 if(lines.length<2||lines.length>202)throw new Error('Таблица должна содержать заголовок и разделитель; лимит 200 строк данных.');
 let at=from;const all=lines.map(line=>{const s=line.replace(/\r$/,'');const cells=splitTableRow(s,at);at+=line.length+1;return cells;});
 const width=all[0].length;if(!width||width>50||all.some(row=>row.length!==width)||all[1].some(c=>!/^:?-+:?$/.test(c.value)))throw new Error('Неоднозначная структура таблицы: проверьте число ячеек и разделитель в source.');
 return {from,to,source,width,rows:[all[0],...all.slice(2)],alignment:all[1].map(c=>c.value)};
}
export function escapeTablePipes(value){let out='';for(let i=0;i<value.length;i++){if(value[i]==='|'){let n=0;for(let j=i-1;j>=0&&value[j]==='\\';j--)n++;if(n%2===0)out+='\\';}out+=value[i];}return out;}
export function tableCellChange(text,table,row,column,value){
 if(text.slice(table.from,table.to)!==table.source)throw new Error('Таблица изменилась. Откройте ячейку заново.');
 if(/[\r\n]/.test(value))throw new Error('В этом этапе ячейка не поддерживает физические переносы строк.');
 const cell=table.rows[row]?.[column];if(!cell)throw new Error('Ячейка не найдена.');
 const insert=escapeTablePipes(value);if(insert===cell.value)return null;
 const change={from:cell.from,to:cell.to,insert},next=text.slice(0,cell.from)+insert+text.slice(cell.to);if(next.length>131072)throw new Error('Заметка превышает лимит редактора.');
 const checked=parseTable(next,table.from,table.to+insert.length-(cell.to-cell.from));if(checked.rows.length!==table.rows.length||checked.width!==table.width||checked.alignment.join('|')!==table.alignment.join('|'))throw new Error('Изменение нарушает структуру таблицы.');return change;
}
export const BASIC_TABLE='| Столбец 1 | Столбец 2 |\n| --- | --- |\n|  |  |\n|  |  |';
