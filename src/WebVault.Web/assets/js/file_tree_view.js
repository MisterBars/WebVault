(function(root){'use strict';
if(root.WebVaultFileTreeView){if(root.WebVaultFileTreeView.apiVersion===1)return;throw Error('tree_view_version_conflict');}
function createButton(row,path,kind,level,active,expanded,rootLabel){
 if(!row||!row.ownerDocument||typeof row.ownerDocument.createElement!=='function'||typeof row.appendChild!=='function'||typeof path!=='string'||!['folder','file'].includes(kind)||!Number.isInteger(level)||level<1||level>64)throw Error('invalid_tree_row');
 var b=row.ownerDocument.createElement('button'),name=path.split('/').pop();
 b.type='button';b.className='nav-file-title'+(kind==='file'&&active?' is-active':'');b.dataset.path=path;b.dataset.kind=kind;b.setAttribute('role','treeitem');b.setAttribute('aria-level',level);
 if(kind==='folder')b.setAttribute('aria-expanded',!!expanded);
 b.textContent=kind==='folder'?(path?(expanded?'▾ ':'▸ ')+name:typeof rootLabel==='string'?rootLabel:'Хранилище'):name.replace(/\.md$/i,'');
 row.appendChild(b);return b;
}
root.WebVaultFileTreeView=Object.freeze({apiVersion:1,createButton:createButton});
}(typeof window!=='undefined'?window:globalThis));
