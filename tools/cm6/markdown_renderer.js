import MarkdownIt from 'markdown-it';
import mark from 'markdown-it-mark';
import {taskForLine} from './task_model.js';
import {makeTaskCheckbox,makeTaskTime,installTaskStyle} from './task_ui.js';
import {parseTable} from './table_model.js';
import {tableTaskForCell} from './table_task_model.js';
import {makeTableTaskCheckbox,makeTableTaskTime,installTableTaskStyle} from './table_task_ui.js';
const md=new MarkdownIt({html:false,breaks:false,linkify:false,typographer:false}).use(mark);
md.block.ruler.before('hr','wv_frontmatter',(state,start,end,silent)=>{if(start!==0||state.src.slice(state.bMarks[0],state.eMarks[0]).trim()!=='---')return false;let stop=1;while(stop<end&&state.src.slice(state.bMarks[stop],state.eMarks[stop]).trim()!=='---')stop++;if(stop===end)return false;if(silent)return true;const t=state.push('wv_properties','',0);t.map=[0,stop+1];t.content=state.getLines(1,stop,0,false);state.line=stop+1;return true;});
md.inline.ruler.before('link','wv_wiki',(state,silent)=>{const from=state.pos;if(state.src.slice(from,from+2)!=='[[')return false;const end=state.src.indexOf(']]',from+2);if(end<0||state.src.slice(from,end).includes('\n'))return false;const raw=state.src.slice(from+2,end),split=raw.indexOf('|'),target=split<0?raw:raw.slice(0,split),label=split<0?raw:raw.slice(split+1);if(!target.trim())return false;if(!silent){const t=state.push('wv_wiki','',0);t.content=label;t.meta={target:target.trim()};}state.pos=end+2;return true;});
export function parseDocument(text){
 const env={},tokens=md.parse(text,env),starts=[],lines=text.split('\n'),offsets=[];let offset=0;for(const line of lines){offsets.push(offset);offset+=line.length+1;}
 for(const t of tokens)if(t.type==='inline'&&t.map){const n=t.map[0],line=(lines[n]||'').replace(/\r$/,''),task=taskForLine(line,offsets[n]);if(task&&t.children?.[0]?.type==='text'&&/^(?:\[[ xX]\]|[☐☑])(?=\s|$)/.test(t.children[0].content))t.meta={...t.meta,wvTask:task};}
 for(let i=0;i<tokens.length;i++){
  const open=tokens[i];if(open.type!=='table_open'||!open.map)continue;
  for(let j=i+1;j<tokens.length&&tokens[j].type!=='table_close';j++)if(tokens[j].type==='inline'&&tokens[j].meta)delete tokens[j].meta.wvTask;
  try{
   const last=Math.min(open.map[1],lines.length)-1,table=parseTable(text,offsets[open.map[0]],offsets[last]+lines[last].replace(/\r$/,'').length);let row=-1,column=-1;
   for(let j=i+1;j<tokens.length&&tokens[j].type!=='table_close';j++){
    const t=tokens[j];if(t.type==='tr_open'){row++;column=-1;}else if(t.type==='th_open'||t.type==='td_open')column++;
    else if(t.type==='inline'&&table.rows[row]?.[column]){const task=tableTaskForCell(table.rows[row][column]);if(task&&t.children?.[0]?.type==='text'&&/^(?:\[[ xX]\]|[☐☑])(?=\s|$)/.test(t.children[0].content))t.meta={...t.meta,wvCellTask:{...task,sourceText:text,row,column}};}
   }
  }catch{}
 }
 tokens.forEach((t,i)=>{if(t.level===0&&t.map&&t.nesting!==-1)starts.push(i);});const blocks=starts.map((i,n)=>({map:tokens[i].map,tokens:tokens.slice(i,n+1<starts.length?starts[n+1]:tokens.length)}));return {tokens,blocks};
}
const allowed=new Set(['p','h1','h2','h3','h4','h5','h6','strong','em','s','del','mark','blockquote','ul','ol','li','table','thead','tbody','tr','th','td','a']);
function external(href){return /^(https?:\/\/|mailto:)/i.test(href)&&!/[\u0000-\u0020\u007f]/.test(href);}
function note(href){return !!href&&!/^[a-z][a-z0-9+.-]*:/i.test(href)&&!href.startsWith('/')&&!href.includes('\\')&&!href.split('/').some(p=>!p||p==='.'||p==='..');}
export function renderTokens(tokens,onNote){
 const root=document.createElement('div');root.className='wv-render';
 function build(list,container,task=null){const stack=[container];const top=()=>stack[stack.length-1];for(const t of list){
  if(t.hidden)continue;
  if(t.type==='inline'){
   const cellTask=t.meta?.wvCellTask,current=cellTask||t.meta?.wvTask;
   if(current){
    const children=(t.children||[]).slice();children[0]={...children[0],content:children[0].content.replace(/^(?:\[[ xX]\]|[☐☑])[ \t]?/,'')};
    if(!cellTask){const parent=[...stack].reverse().find(e=>e.tagName==='LI')||top();parent.classList.add('wv-task-item');}
    top().appendChild(cellTask?makeTableTaskCheckbox(current):makeTaskCheckbox(current));build(children,top(),current);if(current.checked&&current.stamp&&!current.invalid)top().appendChild(cellTask?makeTableTaskTime(current.stamp.iso):makeTaskTime(current.stamp.iso));
   }else build(t.children||[],top());continue;
  }
  if(t.type==='text'){let text=t.content;if(task?.stamp&&!task.invalid)text=text.replace(task.stamp.raw,'');top().appendChild(document.createTextNode(text));continue;}
  if(t.type==='softbreak'){top().appendChild(document.createElement('br'));continue;}
  if(t.type==='hardbreak'||t.type==='hr'){top().appendChild(document.createElement(t.type==='hr'?'hr':'br'));continue;}
  if(t.type==='code_inline'||t.type==='fence'||t.type==='code_block'){const code=document.createElement('code');code.textContent=t.content;if(t.type==='code_inline')top().appendChild(code);else{const pre=document.createElement('pre');pre.appendChild(code);top().appendChild(pre);}continue;}
  if(t.type==='wv_properties'){const box=document.createElement('details'),title=document.createElement('summary'),pre=document.createElement('pre');title.textContent='Свойства заметки';pre.textContent=t.content;box.append(title,pre);top().appendChild(box);continue;}
  if(t.type==='wv_wiki'){const a=document.createElement('a');a.textContent=t.content;a.href='#';a.dataset.wvNote=t.meta.target;a.title=t.meta.target;top().appendChild(a);continue;}
  if(t.type==='image'){const span=document.createElement('span');span.textContent='[Вложение: '+(t.content||t.attrGet('alt')||t.attrGet('src')||'')+']';top().appendChild(span);continue;}
  if(t.type==='html_inline'||t.type==='html_block'){top().appendChild(document.createTextNode(t.content));continue;}
  if(t.nesting===-1){if(stack.length>1)stack.pop();continue;}
  if(t.nesting===1){const tag=allowed.has(t.tag)?t.tag:'span',element=document.createElement(tag);if(tag==='a'){const href=t.attrGet('href')||'';if(external(href)){element.href=href;element.target='_blank';element.rel='noopener noreferrer';}else if(note(href)&&/\.md$/i.test(href)){element.href='#';element.dataset.wvNote=href;}else element.title='Ссылка пока не поддерживается: '+href;}if(tag==='ol'){const start=t.attrGet('start');if(start&&/^\d+$/.test(start))element.start=Number(start);}if(tag==='td'||tag==='th'){const align=/^text-align:(left|right|center)$/.exec(t.attrGet('style')||'');if(align)element.style.textAlign=align[1];}top().appendChild(element);stack.push(element);continue;}
  if(t.content)top().appendChild(document.createTextNode(t.content));
 }}
 build(tokens,root);root.querySelectorAll('blockquote').forEach(q=>{const p=q.firstElementChild,n=p&&p.firstChild;if(!n||n.nodeType!==3)return;const m=/^\[!([A-Za-z0-9_-]+)\][+-]?\s*(.*)$/.exec(n.textContent);if(!m)return;const title=document.createElement('strong');title.className='wv-callout-title';title.textContent=m[2]||m[1];n.remove();q.prepend(title);q.classList.add('wv-callout');});root.addEventListener('click',e=>{const a=e.target.closest('a[data-wv-note]');if(a){e.preventDefault();if(onNote)onNote(a.dataset.wvNote);}});return root;
}
export function renderDocument(text,onNote){return renderTokens(parseDocument(text).tokens,onNote);}
export function installMarkdownStyle(){installTaskStyle();installTableTaskStyle();const s=document.createElement('style');s.textContent=`.wv-render{line-height:1.6;overflow-wrap:anywhere;white-space:normal;padding:6px 0}.wv-render>:first-child{margin-top:0}.wv-render>:last-child{margin-bottom:0}.wv-render table{border-collapse:collapse;width:100%}.wv-render td,.wv-render th{border:1px solid var(--background-modifier-border);padding:5px 8px}.wv-render pre{white-space:pre;overflow:auto;background:var(--background-secondary);padding:10px}.wv-render code{font-family:monospace;background:var(--background-secondary)}.wv-render blockquote{border-left:3px solid var(--interactive-accent);margin:8px 0;padding:4px 12px}.wv-render mark{background:var(--text-highlight-bg,#7b682d);color:inherit}.wv-callout-title{display:block}.wv-callout{background:var(--background-secondary)}.wv-render a{color:var(--text-accent,var(--interactive-accent));cursor:pointer}.wv-reading-pane{padding:12px;overflow:auto}`;document.head.appendChild(s);}
