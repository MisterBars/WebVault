import {attachCalendar,installCalendarStyle} from './calendar_ui.js';
import {appendPropertyHistory} from './property_history.js';
import {attachPropertyTypeControl,installPropertyTypeStyle} from './property_type_ui.js';
import {appendPropertyAdder,installPropertyAdderStyle} from './property_add_ui.js';
import {attachPropertySuggestions,installSuggestionStyle} from './property_suggestions_ui.js';
export function parsePropertyWikiLink(value) {
  const match = /^\[\[([^\]\r\n]+)\]\]$/.exec(value.trim());
  if (!match) return null;
  const separator = match[1].indexOf('|');
  const target = (separator < 0 ? match[1] : match[1].slice(0, separator)).trim();
  if (!target) return null;
  const label = separator < 0 ? target : match[1].slice(separator + 1).trim() || target;
  return {target, label};
}

export function appendListValue(values, draft) {
  const value = draft.trim();
  if (!value) return values.slice();
  if (/[\r\n]/.test(value)) throw new Error('Добавляйте по одному значению без переноса строки.');
  return values.includes(value) ? values.slice() : [...values, value];
}

export function createPanel(text, {readOnly=true, onCommit, restoreFocus, onNote, getSuggestions, getNameSuggestions, history}={}, {inspectProperties, propertyChange, propertyAddChange, propertyTypePreview}) {
  const model = inspectProperties(text);
  const root = document.createElement('section');
  root.className = 'wv-properties wv-properties-v2';
  const heading = document.createElement('h3');
  heading.textContent = 'Свойства';
  appendPropertyHistory(root,heading,history);
  if (model.error) {
    const alert = document.createElement('p');
    alert.setAttribute('role', 'alert');
    alert.textContent = 'Проверьте YAML в исходном коде: ' + model.error;
    root.appendChild(alert);
    return root;
  }
  if (!model.entries.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Свойств пока нет. Можно добавить новое поле ниже.';
    root.appendChild(empty);
  }
  for (const entry of model.entries) {
    const row = document.createElement('div');
    row.className = 'wv-property-row';
    const label = document.createElement('label');
    label.className = 'wv-property-name';
    const icon = document.createElement('button');
    icon.type = 'button';
    icon.className = 'wv-property-type-button';
    icon.textContent = ({text:'Aa', number:'#', checkbox:'✓', date:'▦', datetime:'▦', list:'☷', tags:'#'})[entry.type];
    const nameCell = document.createElement('div');
    nameCell.className = 'wv-property-name-cell';
    label.appendChild(document.createTextNode(entry.key));
    nameCell.append(icon,label);
    const cell = document.createElement('div');
    cell.className = 'wv-property-value';
    const error = document.createElement('span');
    error.className = 'wv-property-error';
    error.setAttribute('role', 'status');
    row.append(nameCell, cell);
    root.appendChild(row);
    attachPropertyTypeControl(icon,{entry,root,row,error,entries:model.entries,readOnly,onCommit,restoreFocus,preview:target=>propertyTypePreview(text,entry.key,target)});
    let committing = false;
    function commit(value, focusControl) {
      if (readOnly || committing) return false;
      try {
        const change = propertyChange(text, entry.key, value);
        error.textContent = '';
        if (!change) return true;
        if (!onCommit) throw new Error('Редактирование недоступно.');
        const focused = focusControl && row.contains(document.activeElement);
        committing = true;
        onCommit(change);
        if (focused && restoreFocus) queueMicrotask(() => restoreFocus(entry.key));
        return true;
      } catch (e) {
        committing = false;
        error.textContent = e.message;
        return false;
      }
    }
    function identify(control) {
      control.dataset.wvProperty = entry.key;
      control.id = 'wv-prop-' + Math.random().toString(36).slice(2);
      control.setAttribute('aria-label', entry.key);
      control.disabled = readOnly;
      label.htmlFor = control.id;
    }
    if (entry.readonly) {
      const pre = document.createElement('pre');
      pre.textContent = entry.raw || 'null';
      pre.title = 'Сложное значение: редактирование в исходнике';
      cell.append(pre, error);
      continue;
    }
    if (['list', 'tags'].includes(entry.type)) {
      const field = document.createElement('div');
      field.className = 'wv-property-list-field';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'wv-property-list-input';
      input.autocomplete = 'off';
      input.placeholder = readOnly ? '' : 'Добавить…';
      identify(input);
      entry.value.forEach((value, index) => {
        const wiki = parsePropertyWikiLink(value);
        const chip = document.createElement('span');
        chip.className = wiki ? 'wv-property-link-item' : 'wv-property-chip';
        const content = document.createElement(wiki ? 'a' : 'span');
        content.className = wiki ? 'wv-property-note-link' : 'wv-property-chip-text';
        content.textContent = wiki ? wiki.label : value;
        if (wiki) {
          content.href = '#';
          content.title = wiki.target;
          content.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            if (!onNote) {
              error.textContent = 'Переход к заметке недоступен.';
              return;
            }
            if (input.value.trim() && !input.wvCommit()) return;
            onNote(wiki.target);
          });
        }
        chip.appendChild(content);
        if (!readOnly) {
          const remove = document.createElement('button');
          remove.type = 'button';
          remove.className = 'wv-property-chip-remove';
          remove.textContent = '×';
          remove.setAttribute('aria-label', 'Удалить ' + value + ' из ' + entry.key);
          remove.addEventListener('mousedown', event => event.preventDefault());
          remove.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            if (input.value.trim()) {
              error.textContent = 'Сначала добавьте ввод через Enter или очистите его через Escape.';
              input.focus();
              return;
            }
            input.focus();
            commit(entry.value.filter((_, i) => i !== index), true);
          });
          chip.appendChild(remove);
        }
        field.appendChild(chip);
      });
      input.wvCommit = () => {
        if (readOnly) return true;
        try {
          const values = appendListValue(entry.value, input.value);
          const ok = commit(values, true);
          if (ok) input.value = '';
          return ok;
        } catch (e) {
          error.textContent = e.message;
          return false;
        }
      };
      if (!readOnly && getSuggestions) attachPropertySuggestions(input,field,{key:entry.key,selected:entry.value,getSuggestions});
      input.addEventListener('keydown', event => {
        if (event.isComposing || event.keyCode === 229) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          input.wvCommit();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          input.value = '';
          error.textContent = '';
        }
      });
      field.addEventListener('click', event => {
        if (!readOnly && !event.target.closest('button,a')) input.focus();
      });
      field.appendChild(input);
      cell.append(field, error);
      continue;
    }
    const multi = entry.type === 'text' && entry.value.includes('\n');
    const input = document.createElement(multi ? 'textarea' : 'input');
    if (multi) input.rows = 3;
    if (entry.type === 'checkbox') {
      input.type = 'checkbox';
      input.checked = entry.value;
    } else {
      input.type = entry.type === 'datetime' ? 'datetime-local' : entry.type === 'date' ? 'date' : entry.type === 'number' ? 'number' : 'text';
      if (entry.type === 'number') input.step = 'any';
      input.value = String(entry.value);
    }
    identify(input);
    input.wvCommit = () => {
      if (readOnly) return true;
      try {
        let value = input.value;
        if (entry.type === 'checkbox') value = input.checked;
        if (entry.type === 'number') {
          if (!input.value.trim()) throw new Error('Введите число.');
          value = Number(input.value);
        }
        if (['date', 'datetime'].includes(entry.type) && (!input.value || !input.checkValidity())) throw new Error('Введите корректную дату.');
        return commit(value, true);
      } catch (e) {
        error.textContent = e.message;
        return false;
      }
    };
    input.addEventListener('change', input.wvCommit);
    input.addEventListener('keydown', event => {
      if (event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Enter' && !multi) {
        event.preventDefault();
        event.stopPropagation();
        input.wvCommit();
      }
    });
    cell.append(input, error);
    if(['date','datetime'].includes(entry.type))attachCalendar(input,{kind:entry.type,onError:message=>{error.textContent=message;}});
  }
  appendPropertyAdder(root,{entries:model.entries,readOnly,getNameSuggestions,restoreFocus,onAdd:(key,type,draft)=>{if(!onCommit)throw new Error('Редактирование недоступно.');onCommit(propertyAddChange(text,key,type,draft));}});
  return root;
}

export function installPanelStyle() {
  installCalendarStyle();
  installPropertyTypeStyle();
  installPropertyAdderStyle();
  installSuggestionStyle();
  if (document.getElementById('wv-properties-v2-style')) return;
  const style = document.createElement('style');
  style.id = 'wv-properties-v2-style';
  style.textContent = `
.wv-properties-v2 .wv-property-row{padding:4px 6px;border-radius:var(--radius-s,4px)}
.wv-properties-v2 .wv-property-row:hover,.wv-properties-v2 .wv-property-row:focus-within{background:var(--background-modifier-hover)}
.wv-properties-v2 .wv-property-list-field{display:flex;flex-wrap:wrap;align-items:center;gap:5px;min-height:32px;padding:3px 5px;border:1px solid transparent;border-radius:var(--input-radius,4px);cursor:text;min-width:0}
.wv-properties-v2 .wv-property-list-field:focus-within{border-color:var(--interactive-accent);background:var(--background-modifier-form-field)}
.wv-properties-v2 .wv-property-chip{display:inline-flex;align-items:center;gap:3px;max-width:100%;padding:1px 7px;border:1px solid var(--background-modifier-border);border-radius:999px;background:var(--background-secondary);color:var(--text-normal)}
.wv-properties-v2 .wv-property-link-item{display:inline-flex;align-items:center;gap:3px;max-width:100%;padding:1px 0;background:transparent;border:0;border-radius:0}
.wv-properties-v2 .wv-property-note-link{min-width:0;overflow-wrap:anywhere;color:var(--text-accent);text-decoration:underline;cursor:pointer}
.wv-properties-v2 .wv-property-note-link:hover{color:var(--text-accent-hover,var(--interactive-accent))}
.wv-properties-v2 .wv-property-chip-text{min-width:0;overflow-wrap:anywhere}
.wv-properties-v2 .wv-property-chip-remove{display:inline-flex;align-items:center;justify-content:center;flex:none;width:18px;height:18px;min-height:0;margin:0;padding:0;border:0;border-radius:50%;background:transparent;color:var(--text-muted);font:inherit;line-height:1;cursor:pointer}
.wv-properties-v2 .wv-property-chip-remove:hover{background:var(--background-modifier-hover);color:var(--text-normal)}
.wv-properties-v2 .wv-property-value .wv-property-list-input{flex:1 1 90px;width:auto;min-width:60px;max-width:100%;min-height:24px;padding:1px 2px;border:0;background:transparent;box-shadow:none;outline:none;font:inherit;color:var(--text-normal)}
.wv-properties-v2 .wv-property-list-input:focus{border:0;outline:none}
.wv-properties-v2 .wv-property-list-input::placeholder{color:var(--text-faint)}
.wv-properties-v2 .wv-property-list-input:disabled{display:none}
`;
  document.head.appendChild(style);
}
