import {createBenchmarkVaultSource} from './benchmark_vault_source.js';
export async function loadBenchmarkIndex(fixture,{loadIndex,signal,check=()=>{},pause}={}){
 if(!fixture||!Array.isArray(fixture.notes)||typeof loadIndex!=='function')throw Error('invalid_benchmark_index');
 function guard(){if(signal?.aborted)throw Error('cancelled');check();}
 const source=createBenchmarkVaultSource(fixture.notes,{signal,check,pause});
 try{
  const loaded=await loadIndex(source,{check:guard});guard();const state=source.snapshot(),expected=new Map(fixture.notes.map(note=>[note.path,note]));
  if(!loaded||!Array.isArray(loaded.notes)||loaded.notes.length!==expected.size||loaded.notes.some(note=>{if(!note||typeof note!=='object')return true;const original=expected.get(note.path);return !original||note.version!==original.version||Object.hasOwn(note,'text')||JSON.stringify(note.refs)!==JSON.stringify(original.refs);})||new Set(loaded.notes.map(note=>note.path)).size!==expected.size||!loaded.statistics||loaded.statistics.folders!==state.folders||loaded.statistics.reads!==state.files||loaded.statistics.bytes!==fixture.bytes||state.lists!==state.folders||state.reads!==state.files||state.bytes!==fixture.bytes)throw Error('incorrect_synthetic_index');
  return {notes:loaded.notes,statistics:{...loaded.statistics,lists:state.lists,readYieldEvery:state.readYieldEvery}};
 }finally{source.dispose();}
}
