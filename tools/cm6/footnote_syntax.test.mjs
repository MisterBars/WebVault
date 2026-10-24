import test from 'node:test';
import assert from 'node:assert/strict';
import {footnoteDefinitionHead,readFootnoteDefinition,readNamedFootnote,readInlineFootnote} from './footnote_syntax.js';
test('definition body has exact source maps and stops before trailing blank lines',()=>{
 const text='[^second]: First paragraph.\n\n    Second **bold** and `code`.\n\nnext',d=readFootnoteDefinition(text);assert.equal(d.body,'First paragraph.\n\nSecond **bold** and `code`.');assert.equal(text.slice(d.to),'\n\nnext');
 for(const m of d.bodyMap)assert.equal(d.body.slice(m.bodyFrom,m.bodyTo),text.slice(m.from,m.to));
});
test('CRLF and tabs retain physical source positions',()=>{
 const text='before\r\n\r\n[^x]: first\r\n\r\n\tsecond\r\n\r\nafter',from=text.indexOf('[^x]'),d=readFootnoteDefinition(text,from);assert.equal(d.from,from);assert.equal(d.body,'first\r\n\r\nsecond');assert.equal(text.slice(d.to),'\r\n\r\nafter');for(const m of d.bodyMap)assert.equal(d.body.slice(m.bodyFrom,m.bodyTo),text.slice(m.from,m.to));
});
test('four spaces consumed only in a definition, extra indentation retained as body code',()=>{assert.equal(readFootnoteDefinition('    [^x]: code'),null);assert.equal(readFootnoteDefinition('[^x]: text\n\n        code').body,'text\n\n    code');});
test('multiple blank continuation lines do not consume a following definition',()=>{const d=readFootnoteDefinition('[^x]: one\n\n\n    two\n\n[^y]: next');assert.equal(d.body,'one\n\n\ntwo');assert.equal(d.to,'[^x]: one\n\n\n    two'.length);});
test('empty first line, BOM and EOF are explicit',()=>{assert.equal(readFootnoteDefinition('[^x]:\n    body').body,'\nbody');assert.equal(readFootnoteDefinition('\uFEFF[^x]: body').body,'body');assert.equal(readFootnoteDefinition('[^x]:').body,'');assert.equal(readFootnoteDefinition('[^x]: body').end,10);});
test('invalid definition heads and partial line starts reject',()=>{for(const text of ['[^bad label]: body','[^]: body','> [^x]: quote','- [^x]: list','\t[^x]: code'])assert.equal(footnoteDefinitionHead(text),null,text);assert.equal(readFootnoteDefinition('x [^n]: body',2),null);});
test('named references preserve Unicode and ignore escapes and image prefix',()=>{assert.deepEqual(readNamedFootnote('a [^тест]',2),{kind:'named',label:'тест',from:2,to:9});assert.equal(readNamedFootnote('\\[^x]',1),null);assert.equal(readNamedFootnote('![^x]',1),null);assert.equal(readNamedFootnote('[^bad label]'),null);});
test('inline note balances nested brackets, escapes and inline code',()=>{for(const body of ['ordinary','a [label](url)','a \\] and more','a `]` and more','a ``[`]`` and more']){const text='^['+body+'] tail',r=readInlineFootnote(text);assert.equal(r.body,body);assert.equal(r.to,body.length+3);}});
test('incomplete, empty, multiline and overly deep inline notes remain literal',()=>{for(const text of ['^[','^[ ]','^[one\ntwo]','^[one\r\ntwo]','^['+'['.repeat(32)+'x'+']'.repeat(33)])assert.equal(readInlineFootnote(text),null,text);assert.equal(readInlineFootnote('\\^[literal]',1),null);assert.equal(readInlineFootnote('^[long body]',0,5),null);});
