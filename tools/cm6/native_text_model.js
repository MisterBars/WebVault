export function isNativeTextBlock(block){
 const type=block?.tokens?.[0]?.type;
 if(type==='fence'||type==='code_block')return true;
 if(type!=='paragraph_open')return false;
 for(const t of block.tokens){if(t.meta?.wvTask||t.meta?.wvCellTask)return false;if(t.type!=='inline')continue;if(/\\|&(?:#[0-9a-z]+|[a-z]+);/i.test(t.content||''))return false;for(const c of t.children||[])if(['wv_wiki','link_open','image','html_inline'].includes(c.type)||c.type==='hardbreak'&&/^<br/i.test(c.markup||''))return false;}
 return true;
}
export function markerVisible(ranges,from,to){return ranges.some(r=>r.empty?r.head>=from&&r.head<=to:r.from<to&&r.to>from);}
