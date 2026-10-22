import test from 'node:test';
import assert from 'node:assert/strict';
import {historyButtonState} from './note_history_controls.js';
const base={writable:true,blockedByDraft:false,canUndo:true,canRedo:true,undoDepth:3,redoDepth:2};
test('visible names and tooltips describe document history',()=>{
 const undo=historyButtonState('undo',base),redo=historyButtonState('redo',base);
 assert.equal(undo.label,'Отменить');assert.equal(redo.label,'Повторить');
 assert.match(undo.title,/заметки/);assert.match(undo.title,/Ctrl\+Z/);assert.match(redo.title,/Ctrl\+Shift\+Z/);assert.match(undo.title,/3/);
});
test('empty history is disabled with explicit reason',()=>{
 const state=historyButtonState('undo',{...base,canUndo:false,undoDepth:0});
 assert.equal(state.disabled,true);assert.match(state.title,/нет изменений/);
});
test('draft and read-only reasons do not claim available undo',()=>{
 const draft=historyButtonState('undo',{...base,blockedByDraft:true,canUndo:false});
 assert.equal(draft.disabled,true);assert.match(draft.title,/подтвердите/);
 const locked=historyButtonState('redo',{...base,writable:false,canRedo:false});
 assert.equal(locked.disabled,true);assert.match(locked.title,/недоступно/);
});
test('accessible shortcuts include keyboard alternatives',()=>{
 assert.match(historyButtonState('undo',base).ariaKeyShortcuts,/Meta\+Z/);
 assert.match(historyButtonState('redo',base).ariaKeyShortcuts,/Control\+Y/);
});
