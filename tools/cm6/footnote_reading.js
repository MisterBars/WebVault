export function readingSourceLines(text){const lines=[];let from=0;const re=/\r\n|\r|\n/g;let m;while((m=re.exec(text))){lines.push({from,to:m.index,text:text.slice(from,m.index)});from=m.index+m[0].length;}lines.push({from,to:text.length,text:text.slice(from)});return lines;}
export function inlineSourceMap(content,map,lines){if(!map)return null;let start=0;return content.split('\n').map((text,i)=>{const line=i<map[1]-map[0]?lines[map[0]+i]:null,at=line?line.text.indexOf(text):-1,row={start,end:start+text.length,from:at<0?null:line.from+at};start+=text.length+1;return row;});}
export function inlineSourceAt(map,pos){const row=map?.find(r=>pos>=r.start&&pos<=r.end);return row&&row.from!==null?row.from+pos-row.start:null;}
export function maskFootnoteDefinitions(text,definitions){const chars=text.split('');for(const d of definitions)if(Number.isSafeInteger(d.from)&&Number.isSafeInteger(d.to)&&d.from>=0&&d.to<=chars.length&&d.from<d.to)for(let i=d.from;i<d.to;i++)if(chars[i]!=='\r'&&chars[i]!=='\n')chars[i]=' ';return chars.join('');}
import {createSourceMarkdown} from './source_markdown.js';
import {collectFootnoteSyntax} from './source_footnotes.js';
let scopeCounter=0;
export function createFootnoteReadingContext(text,tokens){
 const lines=readingSourceLines(text),front=tokens[0]?.type==='wv_properties'?tokens[0]:null;
 const finder=()=>front?{bodyEnd:lines[front.map[1]-1].from,end:lines[front.map[1]]?.from??text.length}:null;
 const model=text.includes('[^')||text.includes('^[')?collectFootnoteSyntax(text,createSourceMarkdown(finder,{footnotes:true}).language.parser.parse(text)):{definitions:[],references:[],notes:[],diagnostics:[],definitionSources:[]};
 return {text,lines,model,scope:'wv-footnote-'+(++scopeCounter),byFrom:new Map(model.references.filter(r=>r.status==='resolved').map(r=>[r.from,r])),inline:null};
}
export function installFootnoteReadingRules(md){
 md.core.ruler.at('inline',state=>{const ctx=state.env.wvFootnoteContext;for(const token of state.tokens)if(token.type==='inline'){if(ctx)ctx.inline={content:token.content,map:inlineSourceMap(token.content,token.map,ctx.lines)};state.md.inline.parse(token.content,state.md,state.env,token.children||(token.children=[]));}if(ctx)ctx.inline=null;});
 md.inline.ruler.before('link','wv_reading_footnote',(state,silent)=>{
  const ctx=state.env.wvFootnoteContext;if(!ctx||state.linkLevel>0||ctx.inline?.content!==state.src)return false;
  let start=state.pos,ref=ctx.byFrom.get(inlineSourceAt(ctx.inline.map,start));
  if(!ref&&start>0&&state.src[start-1]==='^'&&state.pending.endsWith('^')){const prior=ctx.byFrom.get(inlineSourceAt(ctx.inline.map,start-1));if(prior?.kind==='inline'){ref=prior;start--;}}
  if(!ref)return false;const end=start+ref.to-ref.from;
  if(inlineSourceAt(ctx.inline.map,end)!==ref.to||state.src.slice(start,end)!==ctx.text.slice(ref.from,ref.to))return false;
  if(!silent){if(start<state.pos)state.pending=state.pending.slice(0,-1);const t=state.push('wv_footnote_ref','',0);t.content=state.src.slice(start,end);t.meta={scope:ctx.scope,number:ref.number,occurrence:ref.occurrence};}state.pos=end;return true;
 });
}
function noteID(scope,number){return scope+'-note-'+number;}
function refID(scope,number,occurrence){return scope+'-ref-'+number+'-'+occurrence;}
function localLink(target,label){const a=document.createElement('a');a.href='#'+target;a.dataset.wvFootnoteTarget=target;a.setAttribute('data-wv-view-only','true');a.textContent=label;return a;}
export function makeFootnoteReference(meta,raw){
 if(!meta||!/^wv-footnote-\d+$/.test(meta.scope)||!Number.isSafeInteger(meta.number)||meta.number<1||!Number.isSafeInteger(meta.occurrence)||meta.occurrence<1){const span=document.createElement('span');span.textContent=raw;return span;}
 const sup=document.createElement('sup');sup.className='wv-footnote-reference';const a=localLink(noteID(meta.scope,meta.number),String(meta.number));a.id=refID(meta.scope,meta.number,meta.occurrence);a.setAttribute('role','doc-noteref');a.setAttribute('aria-label','Сноска '+meta.number);sup.appendChild(a);return sup;
}
export function attachFootnoteNavigation(root){root.addEventListener('click',event=>{
 const a=event.target.closest?.('a[data-wv-footnote-target]');if(!a)return;event.preventDefault();
 const id=a.dataset.wvFootnoteTarget;if(!/^wv-footnote-\d+-(?:note-\d+|ref-\d+-\d+)$/.test(id))return;
 const target=root.querySelector('#'+id),status=root.querySelector('.wv-footnote-status');
 if(target){if(status)status.textContent='';target.scrollIntoView({block:'nearest'});target.focus({preventScroll:true});}
 else if(status)status.textContent='Упоминание скрыто свёрнутым разделом. Разверните раздел и повторите переход.';
});}
export function footnoteReadingBlocks(plan){const lines=plan.footnotes.lines;return plan.blocks.map(b=>({from:lines[b.map[0]].from,to:lines[Math.min(b.map[1],lines.length)-1].to,tokens:b.tokens}));}
export function appendFootnoteList(root,ctx,onNote,renderTokens,parseFragment){
 const used=new Set(ctx.model.notes.filter(n=>n.definition).map(n=>n.definition.from)),unused=ctx.model.definitionSources.filter(d=>!used.has(d.from));
 if(!ctx.model.notes.length&&!unused.length)return;
 const section=document.createElement('section');section.className='wv-footnotes';section.setAttribute('role','doc-endnotes');section.setAttribute('aria-label','Сноски');section.appendChild(document.createElement('hr'));
 if(ctx.model.notes.length){const list=document.createElement('ol');for(const note of ctx.model.notes){
  const li=document.createElement('li');li.id=noteID(ctx.scope,note.number);li.value=note.number;li.tabIndex=-1;li.setAttribute('role','doc-endnote');
  const body=renderTokens(parseFragment(note.body),onNote);for(const child of Array.from(body.childNodes))li.appendChild(child);
  const back=document.createElement('span');back.className='wv-footnote-backlinks';for(const ref of note.references){const a=localLink(refID(ctx.scope,note.number,ref.occurrence),'↩'+(note.references.length>1?ref.occurrence:''));a.setAttribute('role','doc-backlink');a.setAttribute('aria-label','Вернуться к упоминанию '+note.number+', '+ref.occurrence);back.appendChild(a);}li.appendChild(back);list.appendChild(li);
 }section.appendChild(list);const status=document.createElement('div');status.className='wv-footnote-status';status.setAttribute('role','status');section.appendChild(status);}
 if(unused.length){const details=document.createElement('details'),title=document.createElement('summary');title.textContent='Неиспользованные или повторные определения сносок';details.appendChild(title);for(const d of unused){const pre=document.createElement('pre');pre.textContent=ctx.text.slice(d.from,d.to);details.appendChild(pre);}section.appendChild(details);}
 root.appendChild(section);
}
export const FOOTNOTE_CSS='.wv-footnotes{margin-top:1.5em}.wv-footnotes li{margin:0.6em 0}.wv-footnote-reference{font-size:0.75em;vertical-align:super}.wv-footnote-backlinks a{margin-inline-start:0.5em}.wv-footnote-status{color:var(--text-muted)}.wv-footnotes :focus-visible{outline:2px solid var(--interactive-accent);outline-offset:2px}';
