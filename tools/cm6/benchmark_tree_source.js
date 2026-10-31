import '../../src/WebVault.Web/assets/js/file_tree_data.js';
import {createBenchmarkVaultSource} from './benchmark_vault_source.js';

export async function prepareBenchmarkTreeData(notes,{signal,check=()=>{}}={}){
 function guard(){if(signal?.aborted)throw Error('cancelled');check();}
 const vault=createBenchmarkVaultSource(notes,{signal,check,readable:false}),api=(typeof window==='undefined'?globalThis:window).WebVaultTreeData;
 if(api?.apiVersion!==1){vault.dispose();throw Error('tree_data_missing');}
 const scope={},source=api.create({context:()=>signal?.aborted?'':scope,listFolder:path=>vault.listFolder(path)});
 try{await source.refresh(vault.folderPaths());guard();const state=vault.snapshot();return {source,requests:state.lists,folders:state.folders,files:state.files};}
 catch(e){source.reset();vault.dispose();if(signal?.aborted)throw Error('cancelled');throw e;}
}
