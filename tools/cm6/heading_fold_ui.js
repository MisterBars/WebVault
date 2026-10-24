import {groupFootnotesBySection} from './footnote_sections.js';
import {parseFootnoteDocument,parseMarkdownFragment} from './markdown_renderer.js';
import {footnoteReadingBlocks,appendFootnoteList} from './footnote_reading.js';
export function attachHeadingFold(root,section,folded,onToggle){
 if(!section||!section.hasBody)return;
 installHeadingFoldStyle();
 const heading=root.querySelector('h1,h2,h3,h4,h5,h6');if(!heading)return;
 heading.classList.add('wv-heading-fold-host');
 const button=document.createElement('button');button.type='button';button.className='wv-heading-fold-button';button.dataset.wvHeadingFold=String(section.from);button.setAttribute('data-wv-view-only','true');button.setAttribute('aria-expanded',String(!folded));
 button.title=(folded?'Развернуть':'Свернуть')+' раздел: '+section.label;button.setAttribute('aria-label',button.title);
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 const path=document.createElementNS(ns,'path');path.setAttribute('d','M6 9l6 6 6-6');svg.appendChild(path);button.appendChild(svg);
 button.addEventListener('mousedown',event=>{event.preventDefault();event.stopPropagation();});
 button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();onToggle(section.from);});heading.prepend(button);
}
export function renderHeadingReading({blocks,sections,collapsed,renderTokens,onToggle,onNote}){
 const documentBlock=blocks.find(b=>typeof b.tokens?.[0]?.meta?.wvSourceDocument==='string');
 const plan=documentBlock?parseFootnoteDocument(documentBlock.tokens[0].meta.wvSourceDocument):null;
 const root=renderTokens([],onNote),groups=plan?groupFootnotesBySection(plan.footnotes.model.notes,sections,plan.footnotes.text.length):[];let nextGroup=0;
 function flush(before){while(nextGroup<groups.length&&groups[nextGroup].end<before){const group=groups[nextGroup++];if(group.section&&collapsed.some(s=>group.section.from>=s.from&&group.section.from<=s.to))continue;appendFootnoteList(root,plan.footnotes,onNote,renderTokens,parseMarkdownFragment,{notes:group.notes,includeUnused:false});}}
 for(const block of plan?footnoteReadingBlocks(plan):blocks){
  flush(block.from);
  if(block.synthetic)continue;
  if(collapsed.some(s=>block.from>s.from&&block.from<=s.to))continue;
  const piece=renderTokens(block.tokens,onNote),section=sections.find(s=>s.from===block.from);
  if(section)attachHeadingFold(piece,section,collapsed.some(s=>s.from===section.from),onToggle);
  while(piece.firstChild)root.appendChild(piece.firstChild);
 }
 flush(Infinity);
 if(plan)appendFootnoteList(root,plan.footnotes,onNote,renderTokens,parseMarkdownFragment,{notes:[],includeUnused:true});
 if(typeof window!=='undefined'){window.__WV_FOOTNOTES_READING_TEST='footnotes-reading-20c';window.__WV_FOOTNOTES_SECTIONS_TEST='footnotes-sections-20d';}
 return root;
}
export function installHeadingFoldStyle(){
 if(!document.getElementById('wv-heading-fold-style')){
  const style=document.createElement('style');style.id='wv-heading-fold-style';
  style.textContent=`
.wv-heading-fold-host{position:relative}
.wv-heading-fold-host>.wv-heading-fold-button{position:absolute;left:var(--wv-heading-fold-offset,-24px);top:50%;transform:translateY(-50%);display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;min-height:0;padding:0;margin:0;border:0;border-radius:var(--radius-s,4px);background:transparent;color:var(--text-muted);cursor:pointer}
.wv-heading-fold-host>.wv-heading-fold-button:hover{background:var(--background-modifier-hover);color:var(--text-normal)}
.wv-heading-fold-button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.wv-heading-fold-button[aria-expanded=false] svg{transform:rotate(-90deg)}
.wv-heading-fold-button:focus-visible{outline:2px solid var(--interactive-accent);outline-offset:1px}
`;
  document.head.appendChild(style);
 }
 window.__WV_FOLD_TEST='headings-fold-11';
 window.__WV_FOLD_FIX_TEST='native-fold-rewrite-11b';
}
