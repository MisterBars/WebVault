export const PROPERTY_TYPES = Object.freeze(['text','list','number','checkbox','date','datetime']);
export const TYPE_LABELS = Object.freeze({text:'Текст',list:'Список',number:'Число',checkbox:'Флажок',date:'Дата',datetime:'Дата и время'});
export const TYPE_ICONS = Object.freeze({text:'Aa',list:'☷',number:'#',checkbox:'✓',date:'▦',datetime:'▦'});
export const STANDARD_PROPERTIES = Object.freeze([{key:'tags',type:'list'},{key:'aliases',type:'list'},{key:'cssclasses',type:'list'}]);
export function normalisePropertyName(value) {
  if(typeof value!=='string')throw new Error('Введите имя свойства.');
  const key=value.trim();
  if(!key || key.length>128 || /[\u0000-\u001f\u007f]/.test(key))throw new Error('Имя: от 1 до 128 символов, без управляющих символов.');
  return key;
}
export function collectPropertyNames(entries) {
  return (entries||[]).map(e=>({key:e.key,type:e.readonly?null:e.type==='tags'?'list':PROPERTY_TYPES.includes(e.type)?e.type:null}));
}
export function propertyNameHints(notes, existing=[], query='') {
  const excluded=new Set(existing.map(k=>k.toLowerCase()));
  const map=new Map();
  for(const p of STANDARD_PROPERTIES)map.set(p.key,{...p,standard:true,types:new Set([p.type])});
  for(const note of notes||[])for(const p of note.propertyNames||[]){
    if(typeof p.key!=='string'||p.key.length>128)continue;
    const k=p.key.toLowerCase();
    if(!map.has(k) && map.size<1000)map.set(k,{key:p.key,type:p.type||'text',standard:false,types:new Set()});
    const entry=map.get(k);
    if(entry && p.type)entry.types.add(p.type);
  }
  const needle=query.trim().toLowerCase();
  return [...map.values()].filter(p=>!excluded.has(p.key.toLowerCase())&&p.key.toLowerCase().includes(needle)).map(p=>({key:p.key,type:p.standard?p.type:p.types.size===1?[...p.types][0]:'text',standard:p.standard,mixed:p.types.size>1})).sort((a,b)=>Number(b.standard)-Number(a.standard)||a.key.localeCompare(b.key)).slice(0,30);
}
function validDate(s) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const d=new Date(s+'T00:00:00Z');
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;
}
export function newPropertyValue(type,draft) {
  if(!PROPERTY_TYPES.includes(type))throw new Error('Неизвестный тип свойства.');
  if(type==='checkbox')return draft===true;
  if(type==='list')return typeof draft==='string'&&draft.trim()?[draft.trim()]:[];
  const value=String(draft??'');
  if(type==='text')return value;
  if(type==='number'){
    if(!value.trim())throw new Error('Введите число.');
    const number=Number(value);
    if(!Number.isFinite(number)||(Number.isInteger(number)&&!Number.isSafeInteger(number)))throw new Error('Введите конечное число безопасной точности.');
    return number;
  }
  if(type==='date'&&!validDate(value))throw new Error('Введите корректную дату.');
  if(type==='datetime'){
    const m=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
    if(!m||!validDate(m[1])||+m[2]>23||+m[3]>59||+(m[4]||0)>59)throw new Error('Введите корректные локальные дату и время.');
  }
  return value;
}
export function makePropertyAddition(text,name,type,draft,{inspectProperties,findFrontmatter}) {
  const key=normalisePropertyName(name),model=inspectProperties(text);
  if(model.error)throw new Error(model.error);
  if(model.entries.some(e=>e.key.toLowerCase()===key.toLowerCase()))throw new Error('Свойство с таким именем уже есть.');
  if(model.entries.length>=100)throw new Error('Лимит панели: 100 свойств.');
  const standard=STANDARD_PROPERTIES.find(p=>p.key===key.toLowerCase());
  if(standard&&type!==standard.type)throw new Error('Для стандартного свойства выберите тип Список.');
  const value=newPropertyValue(type,draft),front=findFrontmatter(text);
  if(!front && /^\uFEFF?---[ \t]*(?:\r?\n|$)/.test(text))throw new Error('В начале есть незавершённый YAML-блок; исправьте исходник.');
  const nl=text.includes('\r\n')?'\r\n':'\n';
  const line=JSON.stringify(key)+': '+JSON.stringify(value)+nl;
  const at=front?front.bodyEnd:text.charCodeAt(0)===0xFEFF?1:0;
  const insert=front?(front.body&&!front.body.endsWith('\n')?nl:'')+line:'---'+nl+line+'---'+nl+nl;
  const change={from:at,to:at,insert};
  const next=text.slice(0,at)+insert+text.slice(at);
  if(next.length>131072)throw new Error('Заметка превышает лимит редактора.');
  const checked=inspectProperties(next),entry=checked.entries.find(e=>e.key===key);
  if(checked.error||!entry||entry.readonly||JSON.stringify(entry.value)!==JSON.stringify(value))throw new Error('Безопасно добавить поле не удалось: '+(checked.error||'проверьте YAML.'));
  const actual=entry.type==='tags'?'list':entry.type;
  if(actual!==type)throw new Error('Значение распознаётся как '+actual+', а не '+type+'. Выберите соответствующий тип.');
  return change;
}
