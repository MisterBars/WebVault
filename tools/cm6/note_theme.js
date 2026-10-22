import {EditorView} from '@codemirror/view';
import {syntaxHighlighting} from '@codemirror/language';
import {tags,tagHighlighter} from '@lezer/highlight';
import {HIGHLIGHT_ROLES,NOTE_CSS,createTokenPreview} from './note_theme_contract.js';
export const noteHighlighter=tagHighlighter(HIGHLIGHT_ROLES.map(rule=>{
 if(!tags[rule.tag])throw new Error('Неизвестный highlight tag: '+rule.tag);
 return {tag:tags[rule.tag],class:rule.class};
}));
export const noteAppearance=[EditorView.editorAttributes.of({class:'wv-themed-editor'}),syntaxHighlighting(noteHighlighter)];
export function installNoteAppearance(){
 if(document.getElementById('wv-note-appearance-style'))return;
 const style=document.createElement('style');style.id='wv-note-appearance-style';style.textContent=NOTE_CSS;document.head.appendChild(style);
 const refresh=()=>{if(window.WebVaultCM6)window.WebVaultCM6.view.requestMeasure();};
 new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class','style']});
 if(document.fonts&&document.fonts.addEventListener)document.fonts.addEventListener('loadingdone',refresh);
 const preview=createTokenPreview(document.body.style,(property,value)=>CSS.supports(property,value));
 function computed(selector){const node=document.querySelector(selector);if(!node)return null;const s=getComputedStyle(node);return {fontFamily:s.fontFamily,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,color:s.color,backgroundColor:s.backgroundColor};}
 window.WebVaultAppearance={refresh,preview:values=>{const changed=preview.apply(values);refresh();return {temporary:true,changed};},resetPreview:()=>{preview.reset();refresh();return true;},status:()=>({editor:computed('.cm-editor.wv-themed-editor .cm-content'),reading:computed('.wv-reading-pane .wv-render'),properties:computed('.wv-properties'),markup:computed('.cm-editor .wv-md-formatting'),drawnSelection:computed('.cm-editor .cm-selectionBackground'),textSelection:getComputedStyle(document.body).getPropertyValue('--text-selection').trim(),formatting:getComputedStyle(document.body).getPropertyValue('--text-formatting').trim(),browserSupport:{hasSelector:CSS.supports('selector(:has(*))'),colorMix:CSS.supports('color','color-mix(in srgb, red, blue)')},themeAdapterActivated:false,rawThemeAppliedByThisKit:false})};
 window.__WV_NOTE_THEME_TEST='note-theme-12';
 window.__WV_NOTE_THEME_FIX_TEST='code-selection-softbreak-12b';
}
