export function decodeTablePipes(value){return value.replace(/(\\+)\|/g,(whole,slashes)=>slashes.length%2?slashes.slice(1)+'|':whole);}
function opaqueRanges(text){
 const ranges=[];for(let i=0;i<text.length;){
  if(text[i]==='\\'){i+=2;continue;}
  let close=null,width=0;
  if(text.startsWith('<!--',i)){close='-->';width=4;}
  else if(text.startsWith('%%',i)){close='%%';width=2;}
  else if(text[i]==='`'){while(text[i+width]==='`')width++;close='`'.repeat(width);}
  if(close){let end=text.indexOf(close,i+width);if(close[0]==='`')while(end>=0&&(text[end-1]==='`'||text[end+close.length]==='`'))end=text.indexOf(close,end+1);const closed=end>=0,to=closed?end+close.length:text.length;ranges.push({from:i,to,closed});i=to;}
  else i++;
 }return ranges;
}
export function tableWikiAllowed(text,pos){return Number.isInteger(pos)&&pos>=0&&pos<=text.length&&!opaqueRanges(text).some(r=>pos>r.from&&(pos<r.to||!r.closed&&pos===r.to));}
export function tableWikiValidationText(text){const chars=text.split('');for(const r of opaqueRanges(text))for(let i=r.from;i<r.to;i++)chars[i]=' ';return chars.join('');}
