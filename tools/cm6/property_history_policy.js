export function historyShortcut(event){
 if(event.defaultPrevented||event.isComposing||event.keyCode===229||event.altKey||!(event.ctrlKey||event.metaKey))return null;
 const key=event.key.toLowerCase();
 if(key==='z')return event.shiftKey?'redo':'undo';
 if(key==='y'&&!event.shiftKey)return 'redo';
 return null;
}
export function isPropertyDraft(control,entry){
 if(!entry)return false;
 if(control.list)return !!String(control.value).trim();
 let value=control.type==='checkbox'?control.checked:control.value;
 if(entry.type==='number'&&value!=='')value=Number(value);
 return JSON.stringify(value)!==JSON.stringify(entry.value);
}
export function mayUseDocumentHistory({user,note,hasVault,disabled,readOnly,busy,stateReadOnly}){
 return !!(user&&!user.isAdmin&&!user.mustChangePassword&&hasVault&&note&&!disabled&&!readOnly&&!busy&&!stateReadOnly);
}
