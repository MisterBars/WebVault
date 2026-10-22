import {EditorState,Prec,Transaction} from '@codemirror/state';
import {keymap} from '@codemirror/view';
import {syntaxTree,ensureSyntaxTree} from '@codemirror/language';
import {acceptCompletion,completionStatus,closeCompletion} from '@codemirror/autocomplete';
import {isolateHistory} from '@codemirror/commands';
import {parseDocument} from './markdown_renderer.js';
import {createLinkCatalog} from './link_catalog.js';
import {wikiContext,canonicalWikiTarget,buildWikiLink,inHiddenComment} from './wiki_link_model.js';
function inCode(state,pos){const tree=ensureSyntaxTree(state,pos,50);if(!tree)return true;for(let node=tree.resolveInner(pos,-1);node;node=node.parent)if(/^(FencedCode|CodeBlock|InlineCode|CodeText|WVFrontmatter)$/.test(node.name)||/Comment/.test(node.name))return true;return false;}
export function createWikiCompletions(getContext,getApp){
 const catalog=createLinkCatalog(getApp);
 if(typeof window!=='undefined')window.addEventListener('webvault:catalog-invalidated',()=>{catalog.invalidate();if(window.WebVaultCM6)closeCompletion(window.WebVaultCM6.view);});
 const source=async context=>{
  const owner=getContext();if(!owner.canWrite||context.state.selection.ranges.length!==1||inCode(context.state,context.pos))return null;
  const text=context.state.doc.toString(),range=wikiContext(text,context.pos);if(!range)return null;
  if(inHiddenComment(parseDocument(text.slice(0,range.open)).tokens))return null;
  try{
   const snapshot=await catalog.ensure({refresh:context.explicit}),now=getContext();
   if(context.aborted||!now.canWrite||now.userId!==owner.userId||now.path!==owner.path||now.mode!==owner.mode)return null;
   const sourceFolder=owner.path.split('/').slice(0,-1).join('/');
   const options=snapshot.paths.map(path=>({label:canonicalWikiTarget(path),detail:path,type:'text',boost:sourceFolder&&path.startsWith(sourceFolder+'/')?2:0,apply(view,completion,from,to){
    const active=getContext();
    if(!active.canWrite||active.userId!==owner.userId||active.path!==owner.path||active.mode===2||!catalog.isCurrent(snapshot)){getApp().message('Каталог или заметка изменились. Выберите ссылку ещё раз.');closeCompletion(view);return;}
    const current=wikiContext(view.state.doc.toString(),view.state.selection.main.head);
    if(!current||current.from!==from||inCode(view.state,view.state.selection.main.head))return;
    let insert;try{insert=buildWikiLink(path,current.alias);}catch(error){getApp().message(error.message);closeCompletion(view);return;}
    if(view.state.doc.length-(current.to-current.open)+insert.length>131072){getApp().message('Заметка превышает лимит редактора.');closeCompletion(view);return;}
    view.dispatch({changes:{from:current.open,to:current.to,insert},selection:{anchor:current.open+insert.length},annotations:[Transaction.userEvent.of('input.complete'),isolateHistory.of('full')]});
   }}));
   return {from:range.from,options,validFor:/^[^\[\]\r\n|#]*$/};
  }catch(error){if(!context.aborted)getApp().message('Подсказки ссылок: '+error.message);return null;}
 };
 return {extension:[EditorState.languageData.of(()=>[{autocomplete:source}]),Prec.high(keymap.of([{key:'Tab',run:view=>completionStatus(view.state)==='active'?acceptCompletion(view):false}]))],catalog,source};
}
export function installWikiCompletionStyle(){
 if(!document.getElementById('wv-wiki-completion-style')){
  const style=document.createElement('style');style.id='wv-wiki-completion-style';style.textContent=`
body.webvault-workspace .cm-tooltip-autocomplete{max-width:min(650px,calc(100vw - 32px));background:var(--background-secondary);color:var(--text-normal);border:1px solid var(--background-modifier-border);font:var(--font-ui-small,13px) var(--wv-ui-font,var(--font-interface,sans-serif))}
body.webvault-workspace .cm-tooltip-autocomplete>ul>li[aria-selected=true]{background:var(--background-modifier-active-hover)!important;color:var(--text-normal)!important}
body.webvault-workspace .cm-tooltip-autocomplete .cm-completionLabel{white-space:normal;overflow-wrap:anywhere}
body.webvault-workspace .cm-tooltip-autocomplete .cm-completionDetail{color:var(--text-muted);font-size:var(--font-ui-smaller,12px)}
`;document.head.appendChild(style);
 }
 window.__WV_LINKS_TEST='wiki-links-13';
}
