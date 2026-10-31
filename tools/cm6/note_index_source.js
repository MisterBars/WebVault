export const INDEX_SOURCE_LIMIT=Object.freeze({notes:300,folders:300,bytes:20971520});
function fail(code,message){const error=Error(message);error.code=code;throw error;}
export async function readIndexSource({source,transform,check=()=>{},onProgress=()=>{},limits=INDEX_SOURCE_LIMIT}={}){
 if(!source||typeof source.listFolder!=='function'||typeof source.readNote!=='function'||typeof transform!=='function'||typeof check!=='function'||typeof onProgress!=='function'||!limits)throw Error('invalid_index_source');
 const cap={};for(const key of ['notes','folders','bytes']){const value=limits[key]===undefined?INDEX_SOURCE_LIMIT[key]:limits[key];if(!Number.isInteger(value)||value<1||value>INDEX_SOURCE_LIMIT[key])throw Error('invalid_index_source_limit');cap[key]=value;}
 const paths=[],seen=new Set(),notes=[],encoder=new TextEncoder();let folders=0,bytes=0,reads=0;
 async function scan(path){
  check();const key=path.toLowerCase();if(seen.has(key))return;seen.add(key);
  if(++folders>cap.folders)fail('index_folder_limit','Индекс: слишком много папок.');
  onProgress('Поиск заметок: /'+path);check();const listing=await source.listFolder(path);check();
  if(!listing||!Array.isArray(listing.files)||listing.folders!==undefined&&!Array.isArray(listing.folders)||listing.files.concat(listing.folders||[]).some(p=>typeof p!=='string'))fail('invalid_index_listing','Индекс: некорректный список файлов.');
  paths.push(...listing.files);if(paths.length>cap.notes)fail('index_note_limit',cap.notes===300?'Индекс: максимум 300 заметок в первой версии.':'Индекс: максимум '+cap.notes+' заметок.');
  for(const child of listing.folders||[])await scan(child);
 }
 await scan('');
 for(let i=0;i<paths.length;i++){
  check();const path=paths[i];onProgress('Индекс '+(i+1)+'/'+paths.length+': '+path);check();
  const data=await source.readNote(path);check();reads++;
  if(!data||typeof data.text!=='string'||typeof data.version!=='string')fail('invalid_index_note','Индекс: некорректный ответ чтения заметки.');
  bytes+=encoder.encode(data.text).length;if(bytes>cap.bytes)fail('index_byte_limit',cap.bytes===20971520?'Индекс: содержимое больше 20 MiB.':'Индекс: превышен предел прочитанных байтов.');
  const note=transform(path,data),asynchronous=note&&typeof note.then==='function';if(asynchronous)Promise.resolve(note).catch(()=>{});check();if(!note||typeof note!=='object'||Array.isArray(note)||asynchronous||note.path!==path||note.version!==data.version)fail('invalid_index_transform','Индекс: некорректный результат обработки заметки.');notes.push(note);
 }
 check();return {notes,statistics:{folders,reads,bytes}};
}
