import {attachPropertyWikiPicker} from './property_wiki_picker.js';
import {createLinkCatalog} from './link_catalog.js';
import {validatePropertyLinks} from './property_link_model.js';
import {tableWikiAllowed,tableWikiValidationText} from './table_link_model.js';
export function attachTableWikiPicker(input,cell,view,canWrite,onError){
 const app=window.WebVaultCore,catalog=createLinkCatalog(()=>app),expected=view.state.doc,user=app.state.user?.id,path=app.state.note;
 const valid=()=>input.isConnected&&view.state.doc===expected&&canWrite()&&app.state.user?.id===user&&app.state.note===path;
 return attachPropertyWikiPicker(input,cell,{onError,menuLabel:'Выбор заметки для ячейки',enabled:()=>tableWikiAllowed(input.value,input.selectionStart??input.value.length),validateValue:value=>validatePropertyLinks(tableWikiValidationText(value)),getLinkSuggestions:async({refresh=false}={})=>{
  if(!valid()||!tableWikiAllowed(input.value,input.selectionStart??input.value.length))throw new Error('Подсказки недоступны в коде/комментарии или редактор изменился.');
  const snapshot=await catalog.ensure({refresh});if(!valid()||!catalog.isCurrent(snapshot))throw new Error('Заметка или каталог изменились.');
  return {paths:snapshot.paths,sourcePath:path,isCurrent:()=>valid()&&catalog.isCurrent(snapshot)};
 }});
}
