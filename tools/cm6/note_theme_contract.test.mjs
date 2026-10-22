import test from 'node:test';
import assert from 'node:assert/strict';
import {HIGHLIGHT_ROLES,NOTE_CSS,createTokenPreview} from './note_theme_contract.js';
function mockStyle(){const values=new Map([['--text-selection',{value:'old-color',priority:'important'}]]);return {values,getPropertyValue:n=>values.get(n)?.value||'',getPropertyPriority:n=>values.get(n)?.priority||'',setProperty:(n,v,p='')=>values.set(n,{value:v,priority:p}),removeProperty:n=>values.delete(n)};}
test('syntax names are stable owned classes, not generated CM hashes',()=>{
 assert.equal(new Set(HIGHLIGHT_ROLES.map(r=>r.tag)).size,HIGHLIGHT_ROLES.length);
 assert.ok(HIGHLIGHT_ROLES.every(r=>r.class.split(' ').every(c=>/^wv-[a-z0-9-]+$/.test(c))));
 for(let i=1;i<=6;i++)assert.ok(HIGHLIGHT_ROLES.find(r=>r.tag==='heading'+i));
 assert.equal(HIGHLIGHT_ROLES.find(r=>r.tag==='processingInstruction').class,'wv-md-formatting');
});
test('selection covers CM layer and focused native property fields',()=>{
 assert.match(NOTE_CSS,/cm-selectionBackground\{background:var\(--wv-selection-background/);
 assert.match(NOTE_CSS,/input:focus::selection/);assert.match(NOTE_CSS,/textarea:focus::selection/);
 assert.ok(!/background(?:-color)?:\s*(?:#fff(?:fff)?|white)\b/i.test(NOTE_CSS));
});
test('code, editor and rendered prose consume distinct font roles',()=>{
 for(const role of ['--wv-ui-font','--wv-note-font','--wv-editor-font','--wv-code-font'])assert.ok(NOTE_CSS.includes(role));
 assert.ok(NOTE_CSS.includes('--h1-size'));assert.ok(NOTE_CSS.includes('--h6-size'));
 assert.ok(!/font-family:[^;}]*--font-code\b/.test(NOTE_CSS));
});
test('preview restores original inline values and priorities',()=>{
 const style=mockStyle(),preview=createTokenPreview(style,()=>true);
 preview.apply({selection:'rgba(0,100,200,.3)',textFont:'Georgia, serif'});
 assert.equal(style.getPropertyValue('--font-text-theme'),'Georgia, serif');
 preview.apply({selection:'rgba(0,50,200,.4)'});preview.reset();
 assert.equal(style.getPropertyValue('--text-selection'),'old-color');assert.equal(style.getPropertyPriority('--text-selection'),'important');assert.equal(style.getPropertyValue('--font-text-theme'),'');
});
test('invalid/unknown preview input fails atomically',()=>{
 const style=mockStyle(),preview=createTokenPreview(style,(property,value)=>value!=='invalid');
 assert.throws(()=>preview.apply({textFont:'Georgia',selection:'invalid'}));assert.equal(style.getPropertyValue('--font-text-theme'),'');
 assert.throws(()=>preview.apply({remoteCSS:'https://example.invalid/theme.css'}));
});


// code-selection-softbreak-12b regressions
test('source code tokens do not cover the drawn selection layer',()=>{
 const rule=NOTE_CSS.match(/\.cm-editor\.wv-themed-editor \.wv-md-code\{([^}]+)\}/);
 assert.ok(rule);assert.match(rule[1],/background:transparent/);assert.ok(!rule[1].includes('var(--code-background'));
});
test('rendered code retains its themed background',()=>{
 const rule=NOTE_CSS.match(/body\.webvault-workspace \.wv-render code\{([^}]+)\}/);
 assert.ok(rule);assert.ok(rule[1].includes('background:var(--code-background'));
});
