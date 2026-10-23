export function propertyRemovalRange(text,front,keyRange,valueRange){
 if(!front||!keyRange||!valueRange)throw new Error('Не удалось определить границы свойства.');
 const key=front.bodyStart+keyRange[0],keyEnd=front.bodyStart+keyRange[1];
 let to=front.bodyStart+valueRange[1];
 const from=text.lastIndexOf('\n',key-1)+1;
 if(from<front.bodyStart||keyEnd>to||to>front.bodyEnd||key<from||!Number.isInteger(to)||!Number.isInteger(key)||!Number.isInteger(keyEnd)||/[\r\n]/.test(text.slice(key,keyEnd))||!/^[ \t]*$/.test(text.slice(from,key)))throw new Error('Неоднозначная запись ключа; используйте исходник.');
 if(text[to-1]!=='\n'){
  const newline=text.indexOf('\n',to),end=newline<0?text.length:newline;
  if(end>=front.bodyEnd||!/^[ \t]*(?:#[^\r\n]*)?\r?$/.test(text.slice(to,end)))throw new Error('Не удалось безопасно отделить строку свойства.');
  to=end+1;
 }
 if(to>front.bodyEnd||from>=to)throw new Error('Некорректный диапазон удаления.');
 return {from,to,insert:''};
}
export function makePropertyRemoval(text,key,{inspectProperties,parseDocument,isMap,isScalar}){
 const model=inspectProperties(text),entry=model.entries.find(e=>e.key===key);
 if(model.error)throw new Error(model.error);
 if(!entry||entry.readonly)throw new Error('Сложное свойство удаляется в исходнике.');
 const doc=parseDocument(model.front.body,{schema:'core',version:'1.2',keepSourceTokens:true,intAsBigInt:true,resolveKnownTags:false});
 if(doc.errors.length||doc.warnings.length||!isMap(doc.contents)||doc.contents.flow)throw new Error('Проверьте YAML в исходнике.');
 const pair=doc.contents.items.find(p=>isScalar(p.key)&&p.key.value===key);
 if(!pair||pair.key.anchor||pair.key.tag||!pair.value||pair.value.anchor||pair.value.tag)throw new Error('Связанные YAML-узлы удаляются в исходнике.');
 const change=propertyRemovalRange(text,model.front,pair.key.range,pair.value.range);
 const next=text.slice(0,change.from)+text.slice(change.to),checked=inspectProperties(next),remaining=model.entries.filter(e=>e.key!==key);
 if(checked.error||checked.entries.length!==remaining.length||checked.entries.some((e,i)=>e.key!==remaining[i].key||e.type!==remaining[i].type||e.raw!==remaining[i].raw||JSON.stringify(e.value)!==JSON.stringify(remaining[i].value)))throw new Error('Удаление затрагивает другие свойства; используйте исходник.');
 return change;
}
