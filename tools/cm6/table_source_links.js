import {wikiContext} from './wiki_link_model.js';
import {escapeTablePipes} from './table_model.js';
export function sourceWikiContext(text,pos,blocks){
 const line=text.slice(0,pos).split('\n').length-1,table=blocks.find(b=>b.tokens?.[0]?.type==='table_open'&&b.map[0]<=line&&line<b.map[1]);
 if(!table){const c=wikiContext(text,pos);return c?{...c,inTable:false}:null;}
 if(line===table.map[0]+1)return null;
 const start=text.lastIndexOf('\n',Math.max(0,pos-1))+1,newline=text.indexOf('\n',pos);let left=start,right=newline<0?text.length:newline;
 for(let i=start;i<right;i++)if(text[i]==='|'){let n=0;for(let j=i-1;j>=start&&text[j]==='\\';j--)n++;if(n%2)continue;if(i<pos)left=i+1;else{right=i;break;}}
 const c=wikiContext(text.slice(left,right),pos-left);return c?{...c,open:c.open+left,from:c.from+left,to:c.to+left,inTable:true}:null;
}
export function sourceWikiInsertion(link,inTable){const insert=inTable?escapeTablePipes(link):link,pipe=insert.indexOf('|');return {insert,selectionStart:pipe<0?insert.length:pipe+1,selectionEnd:pipe<0?insert.length:insert.length-2};}
