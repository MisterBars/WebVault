export function validNotePath(path){return typeof path==='string'&&/\.md$/i.test(path)&&!path.startsWith('/')&&!path.includes('\\')&&!/[\u0000-\u001f\u007f:?*<>"|]/.test(path)&&!path.split('/').some(p=>!p||p==='.'||p==='..');}
export function canonicalWikiTarget(path){
 if(!validNotePath(path))throw new Error('Неподдерживаемый путь заметки.');
 return '/'+path.replace(/%/g,'%25').replace(/#/g,'%23').replace(/\[/g,'%5B').replace(/\]/g,'%5D');
}
export function wikiContext(text,pos){
 if(!Number.isInteger(pos)||pos<0||pos>text.length)return null;
 const start=text.lastIndexOf('\n',Math.max(0,pos-1))+1;
 const open=text.lastIndexOf('[[',pos-2);if(open<start||open+2>pos)return null;
 let slashes=0;for(let i=open-1;i>=0&&text[i]==='\\';i--)slashes++;
 if(slashes%2||text[open-1]==='!')return null;
 const before=text.slice(open+2,pos);if(/[\[\]\r\n|#]/.test(before))return null;
 const lineEnd=text.indexOf('\n',pos),endLine=lineEnd<0?text.length:lineEnd;
 const close=text.indexOf(']]',open+2),closed=close>=0&&close<=endLine;
 if(closed&&pos>close)return null;
 const contentEnd=closed?close:endLine,pipe=text.indexOf('|',open+2);
 const hasAlias=pipe>=pos&&pipe<contentEnd;
 let to=closed?close+2:pos;
 if(!closed&&hasAlias)to=endLine;
 else if(!closed&&text[pos]===']')to=pos+(text[pos+1]===']'?2:1);
 return {open,from:open+2,to,query:before,alias:hasAlias?text.slice(pipe+1,contentEnd):undefined};
}
export function buildWikiLink(path,alias){
 if(alias!==undefined&&typeof alias!=='string')throw new Error('Подпись должна быть текстом.');
 const target=canonicalWikiTarget(path),base=path.split('/').pop().replace(/\.md$/i,'');
 let label=alias;
 if(label===undefined)label=/[\]\r\n|]/.test(base)?undefined:base;
 if(label!==undefined&&(/[\r\n]/.test(label)||label.includes(']]')))throw new Error('Подпись содержит разделитель ссылки.');
 return '[['+target+(label===undefined?'':'|'+label)+']]';
}
export function inHiddenComment(tokens){
 let percent=false,html=false;
 function scan(text){for(let i=0;i<text.length;){if(html){if(text.startsWith('-->',i)){html=false;i+=3;}else i++;}else if(percent){if(text.startsWith('%%',i)){percent=false;i+=2;}else i++;}else if(text.startsWith('<!--',i)){html=true;i+=4;}else if(text.startsWith('%%',i)){percent=true;i+=2;}else i++;}}
 function walk(list){for(const token of list){if(token.type==='inline')walk(token.children||[]);else if(token.type==='text')scan(token.content);}}
 walk(tokens);return percent||html;
}
