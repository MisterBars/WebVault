# Актуальный контракт оформления WebVault

Срез: принятая база до `bcfe626`; дополнение `calendar-09` принято пользователем. 22.10.2026. [Исторические уточнения](theme_compatibility.md) · [Changelog](../CHANGELOG.md).

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
| CodeMirror/gutter (gutter-left-10, принят) | .cm-editor.wv-window-gutters, .cm-content, .cm-line, .cm-gutters; исходные номера блоков, измеряемый горизонтальный сдвиг gutter | [editor.js](../tools/cm6/editor.js), [source_gutter_view.js](../tools/cm6/source_gutter_view.js) |
| Свойства | .wv-properties.wv-properties-v2, .wv-property-row:hover/:focus-within, .wv-property-name-cell, .wv-property-name, .wv-property-value, .wv-property-error | [properties.js](../tools/cm6/properties.js), [properties_ui.js](../tools/cm6/properties_ui.js) |
| Списки и ссылки | .wv-property-list-field:focus-within, .wv-property-chip, .wv-property-chip-text, .wv-property-chip-remove, .wv-property-list-input; .wv-property-link-item, a.wv-property-note-link | [properties_ui.js](../tools/cm6/properties_ui.js) |
| Подсказки значений | .wv-property-suggestions[role=listbox] в body, .wv-property-suggestion[aria-selected=true]; combobox/aria-controls/expanded/activedescendant | [property_suggestions_ui.js](../tools/cm6/property_suggestions_ui.js) |
| Добавление поля | .wv-property-add-button, .wv-property-add-form, .wv-property-name-picker, .wv-property-name-menu, .wv-property-name-option[aria-selected=true], .wv-property-type-icon, .wv-property-add-status, .wv-property-add-actions | [property_add_ui.js](../tools/cm6/property_add_ui.js) |
| Преобразование типа | button.wv-property-type-button[aria-expanded], .wv-property-type-panel[role=dialog], .wv-property-type-before, .wv-property-type-after, .wv-property-type-message, .wv-property-type-actions; disabled для защищённых значений | [property_type_ui.js](../tools/cm6/property_type_ui.js) |
| Общая история заметки | .wv-note-history-actions[role=group] в .view-actions; button.wv-note-history-button, svg.wv-note-history-icon, .wv-note-history-label, [data-wv-history=undo/redo], disabled/focus-visible | [note_history_controls.js](../tools/cm6/note_history_controls.js), [property_history.js](../tools/cm6/property_history.js) |
| Даты (calendar-09, принят) | .wv-date-field, .wv-date-input, .wv-date-trigger; .wv-calendar[role=dialog] в body, .wv-calendar-header/jump/grid/week/day/time/preview/message/actions; aria-selected, is-today, is-outside-month, disabled/focus-visible | [calendar_ui.js](../tools/cm6/calendar_ui.js), [calendar_model.js](../tools/cm6/calendar_model.js) |

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

Тематический календарь calendar-09 добавлен как локальный кандидат с реальными DOM-классами ниже. Менеджер тем и настройки сторонних плагинов остаются задачами. Актуальная очередь — [next_steps](next_steps.md).


## Календарь calendar-09 — текущий кандидат
Собственные реальные классы: .wv-date-field, input.wv-date-input, button.wv-date-trigger; section.wv-calendar[role=dialog] в body; .wv-calendar-header, .wv-calendar-nav, .wv-calendar-jump, .wv-calendar-grid, .wv-calendar-week, .wv-calendar-weekday, .wv-calendar-day[aria-selected=true], .is-today, .is-outside-month, .wv-calendar-time, .wv-calendar-preview, .wv-calendar-message[role=status], .wv-calendar-actions, .wv-calendar-apply; .wv-property-add-value для поля создания. Style id wv-calendar-style. Trigger имеет aria-haspopup/expanded/controls, gridcell — roving tabindex и aria-selected/current, dialog — имя и Escape/Tab-навигацию.

Токены: background-primary, background-modifier-border/form-field/box-shadow, interactive-normal/hover/accent, text-normal/muted/faint/error/on-accent, font-ui-small/font-interface, radius-m, input-radius. Собственный --wv-calendar-background по умолчанию берёт background-primary; тень имеет запасное rgba. Все SVG локальные, currentColor; нет CDN/внешних шрифтов. Это не полная реализация менеджера тем и не обещание совпадения пикселей с Obsidian. Статус кандидата не равен браузерной приёмке.


## Gutter исходных строк — кандидат gutter-left-10
Новый реальный класс .wv-window-gutters и .cm-gutters используют transform, задаваемый runtime --wv-source-gutter-shift; style id wv-source-gutter-style. Отступ --wv-gutter-inset читается с .markdown-source-view в CSS px, default 8. Резервированная ширина gutter и положение тела не меняются; цвета/номера/клики CM остаются существующими. При адаптации темы не перезаписывать transform независимо; кастомные CSS-масштабы требуют проверки. Resize/scroll и смена заметки пересчитывают положение. Подробности — [editor_gutters.md](editor_gutters.md). Это локальный кандидат, не завершённая приёмка и не новая нумерация reading.


## Разделы заголовков — кандидат headings-fold-11
.wv-heading-fold-host у реального h1–h6 имеет position:relative; button.wv-heading-fold-button[aria-expanded] позиционируется слева через --wv-heading-fold-offset (fallback -24px), не меняя высоту заголовка. SVG currentColor поворачивается при закрытом разделе; aria-label/title описывают действие. Палитра: text-muted/normal, background-modifier-hover, interactive-accent, radius-s; style id wv-heading-fold-style. data-wv-heading-fold содержит текущую позицию, не постоянный идентификатор заметки; data-wv-view-only исключает эту кнопку из форсирующего click-save gate.
Состояния collapse в EditorState и source-узел WVFrontmatter относятся к поведению, а не к CSS-теме. YAML-стрелки исключаются моделью source, не глобальным скрытием fold gutter. Полная совместимость внешних тем, а также сворачивание отрисованных списков/кода/таблиц этим не заявлены. См. [heading_folding.md](heading_folding.md).


## Выделение и типографика — кандидат note-theme-12
Реальный root-класс .cm-editor.wv-themed-editor, style id wv-note-appearance-style. Подсветка использует стабильные wv-md-heading / wv-md-h1..h6 / wv-md-formatting/em/strong/strike/link/url/code/quote/list и wv-syntax-comment/meta/keyword/string/number/name/operator/punctuation/invalid; случайные CM hash-классы не являются контрактом адаптера. Selection классы CM остаются штатными, им задаются семантические роли.
Токены WebVault --wv-ui-font/note-font/editor-font/code-font/code-size, --wv-selection-background/text, --wv-markup-color/weight, --wv-active-line-background определены defaults в раннем obsidian-tokens.css и зависят от стандартных theme-переменных. NOTE_CSS не подставляет всю Minimal и не трогает geometry gutter/scroll/folding. Заголовки тела стилизуются отдельно от h3 интерфейса свойств. Подробности — [note_appearance.md](note_appearance.md), план импорта — [theme_adapter.md](theme_adapter.md), конкретный аудит — [Minimal 8.1.7](themes/minimal-8.1.7.md).


## Уточнение 12b: фон токенов и переносы
CM selection рисуется ниже текста: непрозрачный background у wv-md-code недопустим для подсветки самих исходных символов. В 12b он transparent, в HTML reading/live-rendered CODE/PRE фон --code-background сохраняется. Будущий адаптер должен различать фон поверхности/слоя и фон inline декорации; opaque/e-ink остаётся отдельной задачей. Цвет --text-selection не меняется этим исправлением.
Один исходный softbreak выводится как настоящий BR, не зависящий от white-space:normal; тема не должна молча скрывать семантический BR. Это политика отображения WebVault, не добавление пробелов/новых строк в Markdown-файл и не изменение code fence LF.
