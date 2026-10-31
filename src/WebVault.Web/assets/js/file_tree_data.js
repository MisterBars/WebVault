(function(root){'use strict';
if(root.WebVaultTreeData){if(root.WebVaultTreeData.apiVersion===1)return;throw Error('tree_data_version_conflict');}
function create(options){
 if(!options||typeof options.listFolder!=='function'||typeof options.context!=='function'||options.onListing!==undefined&&typeof options.onListing!=='function')throw Error('invalid_tree_source');
 var cache=options.initialCache||Object.create(null),generation=0;
 function capture(){var value=options.context();if(value===null||value===undefined||value==='')throw Error('tree_context_unavailable');return {context:value,generation:generation};}
 function check(token){if(token.generation!==generation||token.context!==options.context())throw Error('tree_context_changed');}
 function listing(value){if(!value||!Array.isArray(value.files)||value.folders!==undefined&&!Array.isArray(value.folders))throw Error('invalid_tree_listing');var files=value.files.slice(),folders=(value.folders||[]).slice();if(files.concat(folders).some(function(p){return typeof p!=='string';}))throw Error('invalid_tree_listing');return {files:files,folders:folders};}
 function accept(path,value){if(typeof path!=='string')throw Error('invalid_tree_path');var token=capture(),data=listing(value);check(token);cache[path]=data;return data;}
 function reset(){generation++;cache=Object.create(null);return cache;}
 function load(path){if(typeof path!=='string')return Promise.reject(Error('invalid_tree_path'));var token;try{token=capture();}catch(e){return Promise.reject(e);}return Promise.resolve().then(function(){check(token);return options.listFolder(path);}).then(function(value){check(token);var data=listing(value);check(token);cache[path]=data;if(options.onListing)options.onListing(path,data);return data;});}
 function refresh(paths,onMissing){if(!Array.isArray(paths)||paths.some(function(p){return typeof p!=='string';})||onMissing!==undefined&&typeof onMissing!=='function')return Promise.reject(Error('invalid_tree_refresh'));reset();var token;try{token=capture();}catch(e){return Promise.reject(e);}return paths.slice().sort(function(a,b){return a.length-b.length;}).reduce(function(work,path){return work.then(function(){check(token);return load(path).catch(function(e){check(token);if(e.status!==404)throw e;if(onMissing)onMissing(path);});});},Promise.resolve()).then(function(){check(token);return cache;});}
 return {load:load,refresh:refresh,accept:accept,reset:reset,get:function(path){return cache[path];},get entries(){return cache;}};
}
root.WebVaultTreeData=Object.freeze({apiVersion:1,create:create});
}(typeof window!=='undefined'?window:globalThis));
