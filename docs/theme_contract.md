# Актуальный контракт оформления WebVault

Срез: принятый UI до `bcfe626`, 22.10.2026. [Исторические уточнения](theme_compatibility.md) · [Changelog](../CHANGELOG.md).

Это карта реальных элементов и точек адаптации, а не обещание полного совпадения DOM/CSS Obsidian. Старые разделы исторического документа, где CM/reading ещё отсутствуют, не описывают текущее состояние.

## Основа оформления

- Базовые значения переменных: src/WebVault.Web/assets/css/obsidian-tokens.css.
- Компоновка: src/WebVault.Web/assets/css/workspace.css и application.css.
- Часть стилей редактора/свойств устанавливается JS-модулями. Они могут добавляться после внешних stylesheet: будущий менеджер тем должен явно обеспечить приоритет темы/персональных настроек. Одного подключения произвольного theme.css недостаточно.
- body использует theme-dark/theme-light, mod-windows, is-readable-line-width и webvault-workspace. Наличие токенов не означает готовность менеджера тем.
- Внутренние классы wv- и webvault- являются собственным контрактом проекта. Совпадение части имён с Obsidian не означает поддержку его API/плагинов.

## Карта компонентов

| Компонент | DOM/CSS и состояния | Источник |
| --- | --- | --- |
| Рабочая область | .workspace, .workspace-tabs, .view-header, .view-actions, .view-content, .markdown-source-view, .webvault-editor-container | [workspace.css](../src/WebVault.Web/assets/css/workspace.css) |
| Markdown и чтение | .wv-render, .wv-reading-pane; .wv-callout, .wv-callout-title; базовые таблицы/код/mark | [markdown_renderer.js](../tools/cm6/markdown_renderer.js) |
| CodeMirror | .cm-editor, .cm-content, .cm-line, .cm-gutters; исходные номера отрисованных блоков | [editor.js](../tools/cm6/editor.js) |
| Свойства | .wv-properties.wv-properties-v2, .wv-property-row:hover/:focus-within, .wv-property-name-cell, .wv-property-name, .wv-property-value, .wv-property-error | [properties.js](../tools/cm6/properties.js), [properties_ui.js](../tools/cm6/properties_ui.js) |
| Списки и ссылки | .wv-property-list-field:focus-within, .wv-property-chip, .wv-property-chip-text, .wv-property-chip-remove, .wv-property-list-input; .wv-property-link-item, a.wv-property-note-link | [properties_ui.js](../tools/cm6/properties_ui.js) |
| Подсказки значений | .wv-property-suggestions[role=listbox] в body, .wv-property-suggestion[aria-selected=true]; combobox/aria-controls/expanded/activedescendant | [property_suggestions_ui.js](../tools/cm6/property_suggestions_ui.js) |
| Добавление поля | .wv-property-add-button, .wv-property-add-form, .wv-property-name-picker, .wv-property-name-menu, .wv-property-name-option[aria-selected=true], .wv-property-type-icon, .wv-property-add-status, .wv-property-add-actions | [property_add_ui.js](../tools/cm6/property_add_ui.js) |
| Преобразование типа | button.wv-property-type-button[aria-expanded], .wv-property-type-panel[role=dialog], .wv-property-type-before, .wv-property-type-after, .wv-property-type-message, .wv-property-type-actions; disabled для защищённых значений | [property_type_ui.js](../tools/cm6/property_type_ui.js) |
| Общая история заметки | .wv-note-history-actions[role=group] в .view-actions; button.wv-note-history-button, svg.wv-note-history-icon, .wv-note-history-label, [data-wv-history=undo/redo], disabled/focus-visible | [note_history_controls.js](../tools/cm6/note_history_controls.js), [property_history.js](../tools/cm6/property_history.js) |
| Даты сейчас | Системные input date/datetime-local. Оформление поля доступно теме; системный popup календаря пока не является нашим DOM | [properties_ui.js](../tools/cm6/properties_ui.js), [property_add_ui.js](../tools/cm6/property_add_ui.js) |

## Переменные и ограничения

Основные группы: background-primary/secondary/secondary-alt; background-modifier-border/hover/form-field/box-shadow; text-normal/muted/faint/accent/error; interactive-normal/hover/accent; font-interface/font-text/font-monospace, font-ui-small/font-text-size; radius-s/m/l, input-radius, file-line-width. Дополнительные токены border-hover/text-accent-hover имеют fallback в соответствующих модулях.

Иконки общей истории — локальные SVG с stroke=currentColor, без зависимости от символов системного шрифта/CDN. Для обратной совместимости сохраняются .wv-property-history-actions и .wv-property-history-button; над свойствами дублей кнопок нет. До 760px подписи общих кнопок скрываются, доступные названия/title сохраняются.

Известные имена style-узлов: wv-properties-style, wv-properties-v2-style, wv-property-suggestions-style, wv-property-add-style, wv-property-type-style, wv-note-history-style. Прежний wv-property-history-style заменён новым после обновления страницы. Динамические имена/случайные id отдельных input не являются устойчивыми селекторами темы.

Компоновка общей прокрутки использует ограниченные #notesPane правила с !important. Это осознанная точка адаптации, а не гарантия, что сторонняя тема сможет без правок менять владельца scroll. Не скрывать реальные пустые строки/номера CSS-хаками при переносе темы.

## Что записывать при каждом UI-изменении

- Реальные новые/переименованные классы, data-атрибуты и владелец стилей.
- Токены и оставшиеся fallback/фиксированные размеры; порядок подключения и конфликт специфичности.
- Hover/focus/disabled/ошибки, клавиатура/доступные названия, узкий экран.
- Удалённые/сохранённые compatibility-селекторы и существенные изменения в changelog.
- Отдельно: что реализовано и принято, что ещё планируется. Не обещать полную совместимость темы без проверки конкретной темы.

Тематический календарь, менеджер тем и настройки сторонних плагинов остаются задачами; фиктивные DOM-классы календаря заранее не назначаются. Актуальная очередь — [next_steps](next_steps.md).
