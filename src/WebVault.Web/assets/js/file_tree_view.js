(function(root){'use strict';
if(root.WebVaultFileTreeView){if(root.WebVaultFileTreeView.apiVersion!==1)throw Error('tree_view_version_conflict');if(root.WebVaultFileTreeView.renderVersion===1)return;}
function createButton(row,path,kind,level,active,expanded,rootLabel){
 if(!row||!row.ownerDocument||typeof row.ownerDocument.createElement!=='function'||typeof row.appendChild!=='function'||typeof path!=='string'||!['folder','file'].includes(kind)||!Number.isInteger(level)||level<1||level>64)throw Error('invalid_tree_row');
 var b=row.ownerDocument.createElement('button'),name=path.split('/').pop();
 b.type='button';b.className='nav-file-title'+(kind==='file'&&active?' is-active':'');b.dataset.path=path;b.dataset.kind=kind;b.setAttribute('role','treeitem');b.setAttribute('aria-level',level);
 if(kind==='folder')b.setAttribute('aria-expanded',!!expanded);
 b.textContent=kind==='folder'?(path?(expanded?'▾ ':'▸ ')+name:typeof rootLabel==='string'?rootLabel:'Хранилище'):name.replace(/\.md$/i,'');
 row.appendChild(b);return b;
}
function renderTree(options){
 if(!options||!options.container||!options.container.ownerDocument||typeof options.getListing!=='function'||typeof options.isExpanded!=='function'||typeof options.renderRow!=='function'||options.filterFile!==undefined&&typeof options.filterFile!=='function'||options.beforeChildren!==undefined&&typeof options.beforeChildren!=='function')throw Error('invalid_tree_renderer');
 var doc=options.container.ownerDocument,limit=options.maxRows===undefined?2000:options.maxRows,count=0,truncated=false;
 if(!Number.isInteger(limit)||limit<1||limit>2000)throw Error('invalid_tree_row_limit');
 function draw(path,kind,parent,level){
  if(count>=limit){truncated=true;return;}if(level>64)throw Error('tree_depth_limit');
  var row=doc.createElement('div');parent.appendChild(row);count++;
  if(options.renderRow(row,path,kind,level)===false)return;
  if(kind==='folder'&&options.isExpanded(path)){
   var children=doc.createElement('div');children.className='tree-children';children.setAttribute('role','group');row.appendChild(children);
   if(options.beforeChildren)options.beforeChildren(children,path);
   var data=options.getListing(path);if(data){(data.folders||[]).forEach(function(p){draw(p,'folder',children,level+1);});(data.files||[]).forEach(function(p){if(!options.filterFile||options.filterFile(p,path))draw(p,'file',children,level+1);});}
  }
 }
 draw('','folder',options.container,1);return {rows:count,truncated:truncated};
}
root.WebVaultFileTreeView=Object.freeze({apiVersion:1,renderVersion:1,createButton:createButton,renderTree:renderTree});
}(typeof window!=='undefined'?window:globalThis));
