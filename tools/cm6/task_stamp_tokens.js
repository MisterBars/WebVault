export function stripTaskStampTokens(tokens,task){
 if(!task?.stamp||task.invalid)return tokens;
 const marker='<!--wv-task:'+task.stamp.iso+'-->',out=tokens.map(t=>t.type==='text'?{...t}:t);
 for(let i=0;i<out.length;){
  if(out[i].type!=='text'){i++;continue;}
  let end=i,joined='';while(end<out.length&&out[end].type==='text')joined+=out[end++].content;
  const from=joined.lastIndexOf(marker);if(from>=0){const to=from+marker.length;let offset=0;for(let n=i;n<end;n++){const text=out[n].content,a=Math.max(0,from-offset),b=Math.min(text.length,to-offset);if(a<b)out[n].content=text.slice(0,a)+text.slice(b);offset+=text.length;}return out;}
  i=end;
 }return out;
}
