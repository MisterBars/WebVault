import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../src/WebVault.Web/assets/js/benchmark_workspace_ui.js',import.meta.url),'utf8');
class Element{
 constructor(tag,text=''){this.tag=tag;this._text=text||'';this.children=[];this.parentNode=null;this.open=false;this.hidden=false;this.attrs={};}
 appendChild(v){if(v.parentNode)v.parentNode.children=v.parentNode.children.filter(x=>x!==v);v.parentNode=this;this.children.push(v);return v;}
 insertBefore(v,b){this.appendChild(v);this.children=this.children.filter(x=>x!==v);this.children.splice(this.children.indexOf(b),0,v);return v;}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(v=>v.textContent).join('');}
 setAttribute(k,v){this.attrs[k]=String(v);}removeAttribute(k){delete this.attrs[k];}
 querySelector(s){return this.children.flatMap(x=>[x,...x.descendants()]).find(x=>s.startsWith('.')?x.className===s.slice(1):x.tag===s)||null;}
 descendants(){return this.children.flatMap(x=>[x,...x.descendants()]);}
 showModal(){this.open=true;}close(){this.open=false;}
}
async function fixture(){let adapter;const body=new Element('body');
 const node=(tag,text,parent)=>{const e=new Element(tag,text);if(parent)parent.appendChild(e);return e;};
 const panel=node('section',null,body),details=node('details',null,panel);node('summary','JSON',details);
 const workspace={active:'notes',register(name,pane){body.appendChild(pane);},show(v){this.active=v;},notes(){this.active='notes';}};
 const api={A:{state:{user:{id:7,isAdmin:false,mustChangePassword:false},hasVault:true}},node,button(text,parent,fn){const b=node('button',text,parent);b.onclick=fn;return b;},layout:node('div',null,body),panel,modal:node('dialog',null,body),admin:node('section',null,panel),actions:node('div',null,panel),cancel:node('button',null,panel),exportButton:node('button',null,panel),summary:node('div',null,panel),details,raw:node('pre',null,details),status:node('p',null,panel),entry:node('button',null,body),key:()=> '7|csrf',context:()=>({}),live:()=>true,reset(){},isRunning:()=>false,hasExtension:()=>true,statusRequest:async()=>({canRun:true}),enable(){},core:async()=>{},update(){},getReport:()=>null};
 const root={document:{body},WebVaultWorkspace:workspace,navigator:{},WebVaultBenchmarkUI:{installWorkspaceAdapter:factory=>{adapter=factory(api);}}};
 vm.runInNewContext(source,{window:root,Intl,AbortController});await adapter.open();return {adapter,api,body};
}
function report(status='ok',cleanup='ok'){return {scenario:'server.files.cycle',scenarioVersion:1,protocolVersion:1,fixtureVersion:1,scope:'server-files-cycle-over-http',requestId:'a'.repeat(32),runId:'b'.repeat(32),status,cleanup,reconciliation:'found',statistics:{http:{count:2,median:12.5,mad:1},server:{count:2,median:4.25,mad:0.5}},samples:[{payloadId:'c'.repeat(32),serverCycleMs:4.25}],results:[{id:'server.files.cycle.http',status,statistics:{count:2,median:12.5,mad:1}},{id:'server.files.cycle.server',status,statistics:{count:2,median:4.25,mad:0.5}}]};}
test('actual workspace renderer displays separate HTTP and server rows',async()=>{const f=await fixture(),r=report(),before=JSON.stringify(r);f.adapter.present(r);assert.ok(f.api.summary.textContent.includes('Файловый цикл: HTTP с проверкой ответа'));assert.ok(f.api.summary.textContent.includes('Файловый цикл: серверное время'));assert.ok(f.api.summary.textContent.includes('12,5'));assert.ok(f.api.summary.textContent.includes('4,25'));assert.ok(!f.api.summary.textContent.includes('NaN'));assert.equal(JSON.stringify(r),before);});
test('localized details preserve request and payload identities',async()=>{const f=await fixture();f.adapter.present(report());assert.ok(f.api.raw.textContent.includes('a'.repeat(32)));assert.ok(f.api.raw.textContent.includes('c'.repeat(32)));assert.ok(f.api.raw.textContent.includes('Идентификатор запроса'));assert.ok(f.api.raw.textContent.includes('Серверное время цикла, мс'));assert.ok(f.api.raw.textContent.includes('Изолированный файловый цикл через HTTP'));});
test('server disabled reason and uncertain cleanup are explicit',async()=>{const f=await fixture(),r=report('error','unconfirmed');r.reason='benchmark_files_disabled';f.adapter.present(r);assert.ok(f.api.raw.textContent.includes('Файловый тест выключен на сервере'));assert.ok(f.api.status.textContent.includes('Не подтверждено'));const progress=f.body.descendants().find(x=>x.tag==='progress');assert.ok(progress.value<100);});
test('missing measurement statistics never becomes zero latency',async()=>{const f=await fixture(),r=report('error','unconfirmed');r.results.forEach(x=>x.statistics=null);f.adapter.present(r);assert.ok(f.api.summary.textContent.includes('Нет данных'));assert.ok(!f.api.summary.textContent.includes('NaN'));});
test('existing synthetic HTTP report remains readable',async()=>{const f=await fixture();f.adapter.present({scenario:'http.synthetic.read',status:'ok',cleanup:'ok',statistics:{count:3,median:2,mad:0}});assert.ok(f.api.summary.textContent.includes('Сетевой ответ'));assert.ok(f.api.status.textContent.includes('Успешно'));});
