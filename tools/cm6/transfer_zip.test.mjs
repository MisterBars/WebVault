import test from 'node:test';
import assert from 'node:assert/strict';
import {JSZip,inspectZip,unpackZip,readEntry,safePath} from './transfer_zip.js';
test('paths reject traversal and reserved segments',()=>{for(const p of ['../a.md','/a.md','a\\b.md','CON.md','a/../b.md','a//b.md'])assert.throws(()=>safePath(p));assert.equal(safePath('Тест/00.md'),'Тест/00.md');});
test('zip imports bytes and folder structure',async()=>{const z=new JSZip();z.file('Тест/00.md','# Привет\r\n');const bytes=await z.generateAsync({type:'uint8array'});assert.equal(inspectZip(bytes).filter(e=>!e.dir&&!e.ignored).length,1);const p=await unpackZip(bytes);assert.equal(p.files[0].path,'Тест/00.md');assert.equal(new TextDecoder().decode(p.files[0].bytes),'# Привет\r\n');});
test('zip case collisions rejected',async()=>{const z=new JSZip();z.file('A.md','1');z.file('a.md','2');const bytes=await z.generateAsync({type:'uint8array'});assert.throws(()=>inspectZip(bytes));});
test('zip traversal rejected before library sanitizes it',async()=>{const z=new JSZip();z.file('../evil.md','x');const b=await z.generateAsync({type:'uint8array'});assert.throws(()=>inspectZip(b));});
test('non-markdown files are reported but not imported',async()=>{const z=new JSZip();z.file('a.md','ok');z.file('image.png',new Uint8Array([1,2]));const p=await unpackZip(await z.generateAsync({type:'uint8array'}));assert.equal(p.files.length,1);assert.equal(p.ignored,1);});
test('actual output size is bounded independently of declared size',async()=>{const z=new JSZip();z.file('a.md',new Uint8Array(262145));await assert.rejects(readEntry(z.file('a.md'),{size:1,crc:0}));});
