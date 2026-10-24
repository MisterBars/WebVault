const labelOK=value=>typeof value==='string'&&value.length>0&&value.length<=128&&!/[\s\[\]\u0000-\u001f\u007f]/u.test(value);
function escaped(text,at){let n=0;while(at>0&&text[--at]==='\\')n++;return n%2===1;}
function lineAt(text,from){let to=from;while(to<text.length&&text[to]!=='\r'&&text[to]!=='\n')to++;let end=to;if(text[end]==='\r'&&text[end+1]==='\n')end+=2;else if(end<text.length)end++;return {from,to,end,text:text.slice(from,to)};}
export function footnoteDefinitionHead(text){
 const bom=text.charCodeAt(0)===0xfeff?1:0,m=/^ {0,3}\[\^([^\]\s]+)\]:[ \t]?(.*)$/.exec(text.slice(bom));
 if(!m||!labelOK(m[1]))return null;
 const markerFrom=bom+m[0].indexOf('[^'),labelFrom=markerFrom+2;
 return {label:m[1],markerFrom,labelFrom,labelTo:labelFrom+m[1].length,bodyFrom:bom+m[0].length-m[2].length};
}
function bodyIndent(text){let col=0,i=0;while(i<text.length&&col<4){if(text[i]===' ')col++;else if(text[i]==='\t')col+=4-col%4;else return null;i++;}return col>=4?i:null;}
export function readFootnoteDefinition(text,from=0){
 if(!Number.isSafeInteger(from)||from<0||from>=text.length||from>0&&!/[\r\n]/.test(text[from-1])||text[from]==='\n'&&text[from-1]==='\r')return null;
 const first=lineAt(text,from),head=footnoteDefinitionHead(first.text);if(!head||from>0&&first.text.charCodeAt(0)===0xfeff)return null;
 const rows=[{...first,contentFrom:from+head.bodyFrom}],pending=[];let last=first,pos=first.end;
 while(pos<text.length){
  const line=lineAt(text,pos);if(/^[ \t]*$/.test(line.text)){pending.push(line);pos=line.end;if(line.end===line.from)break;continue;}
  const indent=bodyIndent(line.text);if(indent===null)break;
  for(const blank of pending)rows.push({...blank,contentFrom:blank.from,contentTo:blank.from});pending.length=0;
  rows.push({...line,contentFrom:line.from+indent});last=line;pos=line.end;
 }
 let body='';const bodyMap=[];
 for(let i=0;i<rows.length;i++){
  if(i){const prev=rows[i-1],eol=text.slice(prev.to,prev.end),start=body.length;body+=eol;bodyMap.push({from:prev.to,to:prev.end,bodyFrom:start,bodyTo:body.length});}
  const row=rows[i],to=row.contentTo??row.to,start=body.length;body+=text.slice(row.contentFrom,to);bodyMap.push({from:row.contentFrom,to,bodyFrom:start,bodyTo:body.length});
 }
 return {label:head.label,from,to:last.to,end:last.end,lastLineFrom:last.from,markerFrom:from+head.markerFrom,labelFrom:from+head.labelFrom,labelTo:from+head.labelTo,bodyFrom:from+head.bodyFrom,body,bodyMap};
}
export function readNamedFootnote(text,from=0){
 if(text.slice(from,from+2)!=='[^'||escaped(text,from)||text[from-1]==='!')return null;
 const close=text.indexOf(']',from+2);if(close<0||close-from>130)return null;const label=text.slice(from+2,close);return labelOK(label)?{kind:'named',label,from,to:close+1}:null;
}
export function readInlineFootnote(text,from=0,maxLength=8192){
 if(text.slice(from,from+2)!=='^['||escaped(text,from))return null;
 const stop=Math.min(text.length,from+maxLength);let depth=1,i=from+2;
 while(i<stop){
  const c=text[i];if(c==='\r'||c==='\n')return null;if(c==='\\'){i+=2;continue;}
  if(c==='`'){
   let n=1;while(text[i+n]==='`')n++;let next=i+n,found=-1;
   while(next<stop&&text[next]!=='\r'&&text[next]!=='\n'){if(text[next]!=='`'){next++;continue;}let run=1;while(text[next+run]==='`')run++;if(run===n){found=next+n;break;}next+=run;}
   if(found>=0){i=found;continue;}i+=n;continue;
  }
  if(c==='['){depth++;if(depth>32)return null;}
  else if(c===']'&&!--depth){const body=text.slice(from+2,i);return body.trim()?{kind:'inline',body,from,to:i+1,bodyFrom:from+2,bodyTo:i}:null;}
  i++;
 }
 return null;
}
