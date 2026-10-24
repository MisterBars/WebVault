export function paragraphRows(text,block,parse){
 if(block?.tokens?.[0]?.type!=='paragraph_open'||block.tokens.some(t=>t.meta?.wvTask||t.meta?.wvCellTask))return null;
 const raw=text.slice(block.from,block.to),lines=raw.split('\n');
 function signature(tokens){const out=[];for(const parent of tokens){if(parent.type!=='inline')continue;for(const t of parent.children||[]){if(t.type==='softbreak'||t.type==='hardbreak')continue;const entry=JSON.stringify([t.type,t.tag||'',t.nesting||0,t.content||'',t.attrs||null,t.type==='wv_wiki'?t.meta:null]);out.push(entry);}}return JSON.stringify(out);}
 const rows=[];let from=block.from;
 for(const rawLine of lines){const line=rawLine.replace(/\r$/,''),data=parse(line);if(data.blocks.length!==1||data.blocks[0].tokens[0]?.type!=='paragraph_open')return null;rows.push({from,to:from+line.length,tokens:data.blocks[0].tokens,paragraphRow:true});from+=rawLine.length+1;}
 if(signature(block.tokens)!==signature(rows.flatMap(r=>r.tokens)))return null;
 return rows;
}
export function ensureBreakTails(root){
 for(const p of root.querySelectorAll('p')){const last=p.childNodes[p.childNodes.length-1];if(last?.tagName!=='BR')continue;const tail=document.createElement('span');tail.className='wv-break-tail';tail.setAttribute('aria-hidden','true');tail.textContent='\u200b';p.appendChild(tail);}
 return root;
}
