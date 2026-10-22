import {EditorView,ViewPlugin} from '@codemirror/view';
import {gutterShift} from './source_gutter_model.js';
function installStyle(){
 if(!document.getElementById('wv-source-gutter-style')){
  const style=document.createElement('style');style.id='wv-source-gutter-style';
  style.textContent='.cm-editor.wv-window-gutters .cm-gutters{transform:translateX(var(--wv-source-gutter-shift,0px));z-index:2}';
  document.head.appendChild(style);
 }
 window.__WV_GUTTER_TEST='gutter-left-10';
}
class WindowGutter{
 constructor(view){
  this.view=view;this.dead=false;this.enabled=true;this.watchedGutter=null;this.stats={active:false,reason:'pending'};
  installStyle();
  this.pane=view.dom.closest('.markdown-source-view')||document.querySelector('#notesPane .markdown-source-view');
  this.schedule=()=>this.measure();
  this.observer=typeof ResizeObserver==='function'?new ResizeObserver(this.schedule):null;
  if(this.observer){this.observer.observe(view.dom);if(this.pane)this.observer.observe(this.pane);const container=view.dom.closest('.webvault-editor-container');if(container)this.observer.observe(container);}
  if(this.pane)this.pane.addEventListener('scroll',this.schedule,{passive:true});
  window.addEventListener('resize',this.schedule);
  this.api={status:()=>this.status(),setEnabled:value=>{this.enabled=value!==false;this.measure();return this.enabled;}};
  window.WebVaultGutter=this.api;this.measure();
 }
 update(update){if(update.docChanged||update.viewportChanged||update.geometryChanged||update.transactions.length)this.measure();}
 status(){
  if(this.dead)return {...this.stats,active:false,reason:'destroyed'};
  const gutter=this.view.dom.querySelector('.cm-gutters');
  return {...this.stats,enabled:this.enabled,currentGutterLeft:gutter?gutter.getBoundingClientRect().left:null,contentLeft:this.view.contentDOM.getBoundingClientRect().left};
 }
 measure(){
  if(this.dead)return;
  this.view.requestMeasure({key:this,read:()=>{
   if(this.dead)return null;
   const pane=this.pane,gutter=this.view.dom.querySelector('.cm-gutters');
   if(!pane||!gutter||this.view.dom.closest('[hidden]')||!this.view.dom.getClientRects().length)return null;
   const p=pane.getBoundingClientRect(),g=gutter.getBoundingClientRect();
   if(!p.width||!g.width)return null;
   const raw=parseFloat(getComputedStyle(pane).getPropertyValue('--wv-gutter-inset'));
   const inset=Number.isFinite(raw)?raw:8,previousShift=parseFloat(gutter.style.getPropertyValue('--wv-source-gutter-shift'))||0;
   const shift=this.enabled?gutterShift({paneLeft:p.left,paneRight:p.right,border:pane.clientLeft,inset,gutterLeft:g.left,gutterWidth:g.width,previousShift}):0;
   return {gutter,shift,previousShift,paneLeft:p.left,paneRight:p.right,inset,gutterWidth:g.width,originalGutterLeft:g.left-previousShift,contentLeft:this.view.contentDOM.getBoundingClientRect().left};
  },write:data=>{
   if(this.dead)return;
   if(!data){this.stats={...this.stats,active:false,reason:'hidden-or-unavailable'};return;}
   if(data.gutter!==this.watchedGutter){if(this.observer&&this.watchedGutter)this.observer.unobserve(this.watchedGutter);this.watchedGutter=data.gutter;if(this.observer)this.observer.observe(data.gutter);}
   if(data.shift===null){this.stats={active:false,reason:'invalid-metrics'};return;}
   if(Math.abs(data.shift-data.previousShift)>0.05)data.gutter.style.setProperty('--wv-source-gutter-shift',data.shift+'px');
   this.stats={active:this.enabled,reason:this.enabled?'aligned':'disabled-for-test',shiftPx:data.shift,targetGutterLeft:data.originalGutterLeft+data.shift,paneLeft:data.paneLeft,paneRight:data.paneRight,insetPx:data.inset,gutterWidth:data.gutterWidth,measuredContentLeft:data.contentLeft};
  }});
 }
 destroy(){
  this.dead=true;if(this.observer)this.observer.disconnect();if(this.pane)this.pane.removeEventListener('scroll',this.schedule);window.removeEventListener('resize',this.schedule);
  if(this.watchedGutter)this.watchedGutter.style.removeProperty('--wv-source-gutter-shift');
  if(window.WebVaultGutter===this.api)delete window.WebVaultGutter;
 }
}
export const windowGutters=[EditorView.editorAttributes.of({class:'wv-window-gutters'}),ViewPlugin.fromClass(WindowGutter)];
