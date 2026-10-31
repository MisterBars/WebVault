(function(root){'use strict';
if(root.WebVaultTreeDrag){if(root.WebVaultTreeDrag.apiVersion===1)return;throw Error('tree_drag_version_conflict');}
function create(options){
 var area=options&&options.root;
 if(!area||typeof options.getDrag!=='function'||typeof options.context!=='function'||typeof options.allowed!=='function'||typeof options.isExpanded!=='function'||typeof options.expand!=='function'||typeof options.drop!=='function')throw Error('invalid_tree_drag');
 var doc=area.ownerDocument,win=doc.defaultView||root,hover=null,timer=null,alive=true,listeners=[],schedule=options.setTimer||setTimeout,unschedule=options.clearTimer||clearTimeout;
 function target(node){if(node&&node.nodeType===3)node=node.parentElement;if(!node||!area.contains(node))return null;var folder=node.closest&&node.closest('[data-wv-tree-folder]');return folder&&area.contains(folder)?{path:folder.getAttribute('data-wv-tree-folder'),element:folder}:{path:'',element:area};}
 function permitted(d,t){var context=options.context();return !!(alive&&d&&t&&context&&d.context===context&&typeof d.nonce==='string'&&d.nonce&&options.allowed(t.path,d));}
 function current(t){if(!t||hover!==t||options.getDrag()!==t.drag||!permitted(t.drag,t)||!area.contains(t.element))return false;if(typeof doc.elementFromPoint==='function'&&Number.isFinite(t.x)&&Number.isFinite(t.y)){var hit=target(doc.elementFromPoint(t.x,t.y));if(!hit||hit.path!==t.path||hit.element!==t.element)return false;}return true;}
 function cancel(){if(timer!==null)unschedule(timer);timer=null;if(hover)hover.element.classList.remove('is-drop-target');hover=null;area.classList.remove('wv-tree-dragging');}
 function finish(){cancel();if(options.onEnd)options.onEnd();}
 function error(e,d){if(options.onError&&d.context===options.context())options.onError(e);}
 function over(e){var d=options.getDrag();if(!d)return;e.stopPropagation();if(options.onPoint)options.onPoint(e);var t=target(e.target);if(!permitted(d,t)){if(e.dataTransfer)e.dataTransfer.dropEffect='none';cancel();return;}e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='move';if(hover&&hover.drag===d&&hover.path===t.path&&hover.element===t.element){hover.x=e.clientX;hover.y=e.clientY;return;}cancel();t.drag=d;t.x=e.clientX;t.y=e.clientY;hover=t;area.classList.add('wv-tree-dragging');t.element.classList.add('is-drop-target');if(!options.isExpanded(t.path))timer=schedule(function(){timer=null;if(!current(t))return;Promise.resolve().then(function(){if(current(t))return options.expand(t.path,d,t.element,function(){return current(t);});}).catch(function(e){if(current(t))error(e,d);});},600);}
 function drop(e){var d=options.getDrag();e.preventDefault();if(!d)return;e.stopPropagation();var t=target(e.target),valid=permitted(d,t);try{valid=valid&&!!e.dataTransfer&&e.dataTransfer.getData('application/x-webvault-node')===d.nonce;if(valid){var result=options.drop(t.path,d);if(result&&typeof result.then==='function')result.catch(function(e){error(e,d);});}}catch(e){error(e,d);}finally{finish();}}
 function leave(e){if(!area.contains(e.relatedTarget))cancel();}
 function on(target,type,fn,capture){target.addEventListener(type,fn,!!capture);listeners.push([target,type,fn,!!capture]);}
 on(area,'dragover',over,true);on(area,'drop',drop,true);on(area,'dragleave',leave,false);on(doc,'dragend',finish,true);on(doc,'drop',finish,false);on(win,'blur',finish,false);
 return {cancel:cancel,dispose:function(){if(!alive)return;finish();alive=false;listeners.forEach(function(x){x[0].removeEventListener(x[1],x[2],x[3]);});listeners=[];}};
}
root.WebVaultTreeDrag=Object.freeze({apiVersion:1,create:create});
}(typeof window!=='undefined'?window:globalThis));
