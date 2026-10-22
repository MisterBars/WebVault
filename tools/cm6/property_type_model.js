export const CONVERSION_TYPES=Object.freeze(['text','list','number','checkbox','date','datetime']);
const canonical=type=>type==='tags'?'list':type;
function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');
 return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===value;
}
function validDatetime(value){
 if(typeof value!=='string')return false;
 const m=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
 return !!m&&validDate(m[1])&&+m[2]<24&&+m[3]<60&&+(m[4]||0)<60;
}
export function convertPropertyValue(entry,target){
 if(entry.readonly)throw new Error('Сложное или защищённое значение: изменяйте исходник.');
 if(!CONVERSION_TYPES.includes(target))throw new Error('Неизвестный тип.');
 if(['tags','aliases','cssclasses'].includes(entry.key.toLowerCase())&&target!=='list')throw new Error('Стандартное свойство должно оставаться списком.');
 const source=canonical(entry.type);
 let value=entry.value,warning='Изменится только это свойство в текущей заметке.';
 if(source===target)return {value,warning};
 if(target==='list'){
  if(!['string','number','boolean'].includes(typeof value))throw new Error('Значение нельзя безопасно поместить в список.');
  if(typeof value==='number'&&(!Number.isFinite(value)||(Number.isInteger(value)&&!Number.isSafeInteger(value))))throw new Error('Небезопасное число.');
  const item=String(value);
  if(/[\r\n]/.test(item))throw new Error('Многострочный текст нельзя преобразовать в простой список без изменения содержимого.');
  return {value:[item],warning:'Значение станет единственным строковым элементом списка. '+warning};
 }
 if(Array.isArray(value)){
  if(value.length>1)throw new Error('В списке несколько значений. Объединение или удаление элементов автоматически не выполняется.');
  if(!value.length){if(target==='text')return {value:'',warning:'Пустой список станет пустым текстом. '+warning};throw new Error('Пустой список не содержит значения для этого типа.');}
  value=value[0];
 }
 if(target==='text'){
  if(!['string','number','boolean'].includes(typeof value))throw new Error('Нельзя безопасно получить текст.');
  return {value:String(value),warning};
 }
 if(target==='number'){
  if(typeof value==='boolean')return {value:value?1:0,warning:'Флажок станет числом '+(value?1:0)+'. '+warning};
  const number=typeof value==='number'?value:Number(value);
  if((typeof value!=='number'&&typeof value!=='string')||!Number.isFinite(number)||(Number.isInteger(number)&&!Number.isSafeInteger(number)))throw new Error('Значение не является безопасным конечным числом.');
  if(typeof value==='string'&&String(number)!==value)throw new Error('Нужно каноническое число, например 2 или 0.75. Пробелы, ведущие нули и потеря точности автоматически не исправляются.');
  return {value:number,warning};
 }
 if(target==='checkbox'){
  if(typeof value==='boolean')return {value,warning};
  if(value==='true'||value==='false')return {value:value==='true',warning};
  if(value===0||value===1)return {value:value===1,warning:'Число '+value+' станет '+(value?'включённым':'выключенным')+' флажком. '+warning};
  throw new Error('Для флажка допустимы true/false или числовые 0/1. Другие значения автоматически не угадываются.');
 }
 if(target==='date'){
  if(validDate(value))return {value,warning};
  if(validDatetime(value)&&/T00:00(?::00)?$/.test(value))return {value:value.slice(0,10),warning:'Нулевое время будет убрано; дата сохранится. '+warning};
  throw new Error('Нужна корректная дата YYYY-MM-DD. Ненулевое время отбрасывать нельзя.');
 }
 if(target==='datetime'){
  if(validDatetime(value))return {value,warning};
  if(validDate(value))return {value:value+'T00:00',warning:'Будет явно добавлено время 00:00 без часового пояса. '+warning};
  throw new Error('Нужна корректная дата или локальные дата/время. Часовой пояс автоматически не преобразуется.');
 }
 throw new Error('Преобразование недоступно.');
}
export function makePropertyTypePreview(text,key,target,{inspectProperties}){
 const model=inspectProperties(text);
 if(model.error)throw new Error(model.error);
 const entry=model.entries.find(e=>e.key===key);
 if(!entry)throw new Error('Свойство не найдено.');
 const converted=convertPropertyValue(entry,target);
 if(canonical(entry.type)===target)return {...converted,change:null};
 let insert=JSON.stringify(converted.value);
 if(entry.raw.endsWith('\r\n'))insert+='\r\n';else if(entry.raw.endsWith('\n'))insert+='\n';
 const change={from:entry.from,to:entry.to,insert};
 const next=text.slice(0,change.from)+insert+text.slice(change.to);
 if(next.length>131072)throw new Error('Превышен лимит редактора.');
 const checked=inspectProperties(next),updated=checked.entries.find(e=>e.key===key);
 if(checked.error||!updated||updated.readonly||JSON.stringify(updated.value)!==JSON.stringify(converted.value))throw new Error('Повторная проверка YAML не прошла: '+(checked.error||'значение не совпало.'));
 if(canonical(updated.type)!==target)throw new Error('YAML-панель распознаёт это значение как '+canonical(updated.type)+', а не '+target+'. Для такого преобразования нужна отдельная схема типов; сейчас операция не выполнена.');
 return {...converted,change};
}
