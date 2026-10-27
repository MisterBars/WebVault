# Контракт оформления WebVault

[Указатель](index.md) · [Типографика и выделение](note_appearance.md) · [Проект адаптера](theme_adapter.md) · [История](../CHANGELOG.md) · [Backlog](next_steps.md)

## Область и основания

Предметная карта реальных компонентов, состояний и точек адаптации, не обещание полного совпадения DOM/CSS Obsidian. База этой редакции —2dd2a83c9b7d462727027cf92fc07fe2500e5ccd. Адресно прочитаны note_theme.js/note_theme_contract.js, obsidian-tokens.css, markdown_renderer.js, note_theme_contract.test.mjs/note_theme.test.mjs и группа тематических руководств/аудита. Контракты остальных компонентов сопоставлены с уже сведёнными предметными руководствами; это не новый полный аудит всех JS-модулей, test:all/build/IIS/браузер или проверка установленного bundle.

Календарь, верхняя история, gutter, heading folding и оформление текста имеют реализации и исторические ограниченные проверки; цепочки прежних «кандидатов» не текущий отрицательный статус. Планы, ранние результаты и поздние наблюдения различаются. Подробности свойств — properties_panel.md, текста — live_preview_blocks.md, сносок — footnotes.md; старый theme_compatibility.md пока источник до содержательной сверки/удаления, не конкурирующая актуальная матрица.

## Основа оформления

- Собственные defaults WebVault — [obsidian-tokens.css](../src/WebVault.Web/assets/css/obsidian-tokens.css), не stylesheet Obsidian или полная Minimal. Палитры theme-dark/theme-light и знакомые имена переменных не означают готовый персональный менеджер тем.
- Компоновка — workspace.css/application.css. Body использует theme-dark/theme-light, mod-windows, is-readable-line-width, webvault-workspace. Собственные wv-/webvault-классы не Obsidian API/плагины.
- Базовые токены загружаются рано; часть стилей устанавливается JS после stylesheet. Будущий адаптер обязан определить порядок/специфичность темы и личных настроек, а не рассчитывать на одно подключение произвольного theme.css.
- Палитра/типографика отделены от layout: не переносить чужие gutter/sizer/scroll/Electron-правила автоматически. Общая прокрутка в #notesPane использует локальные !important; не менять её владельца и не скрывать реальные пустые строки/номера ради темы.
- Имена/значения/пути выводятся DOM/textContent. Локальные SVG/currentColor не требуют системного icon-font/CDN; JS из темы не исполняется этим контрактом.

## Карта компонентов

| Компонент | Реальные DOM/CSS и состояния | Каноническое описание / источник |
| --- | --- | --- |
| Оболочка | .app-container, .workspace, .workspace-ribbon, .workspace-split.mod-left-split/.mod-root-split, .workspace-tabs, .workspace-tab-header-container/.workspace-tab-header.is-active, .workspace-leaf/.workspace-leaf-content[data-type=file-explorer/markdown], .nav-header/.nav-files-container/.nav-file/.nav-file-title.is-active/.nav-file-title-content, .view-header/.view-actions/.view-content, .markdown-source-view/.webvault-editor-container, .inline-title/.status-bar | [workspace](workspace_layout.md), [файлы](file_vault.md), [workspace.css](../src/WebVault.Web/assets/css/workspace.css). Одна шапка вкладки не система вкладок/split; строка состояния «символы» считает UTF-16 единицы, не графемы. |
| Markdown/чтение | .wv-render, .wv-reading-pane, .wv-callout/.wv-callout-title, table/code/pre/mark | [Текст](live_preview_blocks.md), [renderer](../tools/cm6/markdown_renderer.js). Реальные source ranges/пустые строки не переписываются оформлением. |
| CodeMirror/исходные номера | .cm-editor.wv-window-gutters, .cm-content/.cm-line/.cm-gutters; runtime --wv-source-gutter-shift | [Gutter](editor_gutters.md), [source_gutter_view.js](../tools/cm6/source_gutter_view.js). Не новая нумерация reading. |
| Нативный текст/заголовки | .wv-native-strong/em/strike/code/highlight/code-line/entity, .wv-native-heading-line/.wv-native-heading-anchor, button.wv-native-heading-button[aria-expanded] | [Текст](live_preview_blocks.md). Не возвращать обычный текст/код/заголовки к цельным BlockWidget/парковке курсора. |
| Разделы заголовков | .wv-heading-fold-host, button.wv-heading-fold-button[aria-expanded], data-wv-heading-fold/data-wv-view-only | [Heading folding](heading_folding.md). Исходная позиция не постоянный id; состояние EditorState не CSS-функция. |
| Свойства | .wv-properties.wv-properties-v2, .wv-property-row:hover/:focus-within, .wv-property-name-cell/name/value/error | [Свойства](properties_panel.md), [properties.js](../tools/cm6/properties.js), [properties_ui.js](../tools/cm6/properties_ui.js). Data-wv-property — имя, не стабильный id. |
| Chips/ссылки свойств | .wv-property-list-field:focus-within, .wv-property-chip/text/remove, .wv-property-list-input, .wv-property-link-item, a.wv-property-note-link | [Свойства](properties_panel.md), [native picker](property_links.md). Ссылки с крестиками и обычные chips сохраняют разное действие. |
| Value-подсказки | .wv-property-suggestions[role=listbox] в body, .wv-property-suggestion[aria-selected=true], combobox/aria-controls/expanded/activedescendant | [property_suggestions_ui.js](../tools/cm6/property_suggestions_ui.js). Не автоматически все скалярные поля. |
| Создание поля | .wv-property-add-button/form/status/actions/value, .wv-property-name-picker/menu/option[aria-selected=true], .wv-property-type-icon | [property_add_ui.js](../tools/cm6/property_add_ui.js). Существующие имена/стандартные списки/guards — поведение, не глобальная схема. |
| Преобразование | button.wv-property-type-button[aria-expanded], .wv-property-type-panel[role=dialog], .wv-property-type-before/after/message/actions; disabled защищённых значений | [property_type_ui.js](../tools/cm6/property_type_ui.js). CSS не снимает запрет потери времени/точности. |
| Удаление поля | .wv-property-remove-button[aria-expanded], .wv-property-remove-panel[role=dialog], совместная .wv-property-type-panel | [Удаление целого поля](properties_panel.md#удаление-целого-поля), [property_remove_ui.js](../tools/cm6/property_remove_ui.js). Не удаление chip. |
| История заметки | .wv-note-history-actions[role=group] в #notesPane .view-actions, button.wv-note-history-button, svg.wv-note-history-icon, .wv-note-history-label, [data-wv-history=undo/redo], disabled/focus-visible | [note_history_controls.js](../tools/cm6/note_history_controls.js), [property_history.js](../tools/cm6/property_history.js). Одна общая история с guards; дублей YAML нет. |
| Календарь | .wv-date-field, input.wv-date-input, button.wv-date-trigger, section.wv-calendar[role=dialog] в body | Раздел ниже и [свойства](properties_panel.md). Собственный date/datetime-календарь, не системный picker и не менеджер тем. |
| Wiki-меню CM | .cm-tooltip-autocomplete, .cm-completionLabel/.cm-completionDetail, li[aria-selected=true] | [Wiki-ссылки](wiki_links.md). Текстовые пути, UI-font и семантическая палитра, не белый system Highlight. |
| Native wiki-picker свойств | .wv-property-wiki-menu[role=listbox] в body, .wv-property-wiki-option[aria-selected=true], .wv-property-wiki-name/path/help | [property_links.md](property_links.md), [property_wiki_picker.js](../tools/cm6/property_wiki_picker.js). Отдельный controller, не CM completion и не heading-picker. |
| Таблицы/списки/задачи/сноски | Собственные редакторы, локальные черновики, checkbox/UTC, определения/номера/backlinks/подсветка | Полные селекторы/guards — [tables.md](tables.md), [list_inline.md](list_inline.md), [footnotes.md](footnotes.md). Старая фраза «ещё не созданы» не текущий статус. |
| Граф | .wv-graph-pane/header/controls/status, svg.wv-graph-svg, g[data-id][role=button][tabindex=0] | [note_graph.md](note_graph.md#domcss-и-доступность). Ключ/путь не постоянный публичный id; палитра/фокус/resize отдельно от модели связей. |

## Переменные и ограничения

Поддерживается подмножество знакомых токенов, не полный каталог Obsidian. Основные группы:

- background-primary/primary-alt/secondary/secondary-alt; background-modifier-border/border-hover/border-focus/hover/active-hover/form-field/box-shadow;
- text-normal/muted/faint/accent/error/selection/on-accent, text-accent-hover и text-formatting с fallback;
- interactive-normal/hover/accent/accent-hover; nav-item-color/color-active/background-active;
- font-interface-theme/font-text-theme/font-monospace-theme, font-interface/font-text/font-monospace/font-editor, font-text-size/font-ui-small/font-ui-smaller, line-height-normal/file-line-width;
- ribbon-width/header-height/tab-height/status-bar-height, radius-s/m/l, input-height/input-radius.

Семантические --wv-ui-font/note-font/editor-font/code-font/code-size, --wv-note-weight/ui-heading-weight, --wv-selection-background/text, --wv-markup-color/weight, --wv-active-line-background заданы defaults в раннем CSS. --font-code — размер, не семейство. Полные роли/preview/ограничения selection — [note_appearance.md](note_appearance.md). Не все компоненты обязаны использовать каждую переменную.

Style-узлы: wv-properties-style, wv-properties-v2-style, wv-property-suggestions-style, wv-property-add-style, wv-property-type-style, wv-property-remove-style, wv-note-history-style, wv-calendar-style, wv-source-gutter-style, wv-heading-fold-style, wv-note-appearance-style, wv-wiki-completion-style, wv-property-wiki-style. Прежний wv-property-history-style заменяется после reload; .wv-property-history-actions/button сохраняются как compatibility-селекторы. Случайные input id и генерируемые CM hash-классы не устойчивые точки темы.

История: SVG stroke=currentColor, без CDN/icon-font. Кнопки имеют aria-label/aria-keyshortcuts/title/disabled; высота30px, рамка и подпись, при ширине до760px подпись скрыта с сохранением доступного названия. Это не гарантия всех тем.

## Календарь и popup

Календарь: .wv-calendar-header/nav/jump/grid/week/weekday/day/time/preview/message/actions/apply; .wv-calendar-day[aria-selected=true], .is-today/.is-outside-month, сообщения role=status, .wv-property-add-value в создании. Trigger имеет aria-haspopup/expanded/controls, gridcell — roving tabindex/aria-selected/current, dialog — имя и Escape/Tab-навигацию. Поведение date/local datetime/секунд/истории описано в properties_panel.md, не меняется CSS.

Токены background-primary, background-modifier-border/form-field/box-shadow, interactive-normal/hover/accent, text-normal/muted/faint/error/on-accent, font-ui-small/font-interface, radius-m/input-radius. --wv-calendar-background использует background-primary с fallback тени rgba. Popup fixed в body; позиционирование/viewport/потеря владельца проверяются отдельно.

Wiki-picker свойств также fixed в body: background-primary, background-modifier-border/active-hover/box-shadow, text-normal/muted, font-ui-small/smaller, --wv-ui-font, radius-s/m. Native textarea-роль не подменяется combobox; picker и обычные value-подсказки владеют собственными aria-controls и не открываются одновременно. Логика имён/типов/календаря не CSS-совместимость.

## Gutter и folding

.cm-editor.wv-window-gutters/.cm-gutters используют runtime transform через --wv-source-gutter-shift, wv-source-gutter-style. --wv-gutter-inset читается с .markdown-source-view в CSS px, default8. Резервированная ширина gutter и положение тела не меняются, штатные цвета/номера/клики CM сохраняются. Resize/scroll/смена заметки пересчитывают положение; независимое переопределение transform и CSS-масштабы требуют проверки.

.wv-heading-fold-host у h1–h6 имеет position:relative; кнопка слева через --wv-heading-fold-offset (fallback -24px), без изменения высоты. SVG поворачивается для закрытого раздела, aria-label/title описывают действие. Токены text-muted/normal, background-modifier-hover, interactive-accent/radius-s; стиль wv-heading-fold-style. Data-wv-view-only исключает кнопку из форсирующего click-save gate. YAML исключается моделью WVFrontmatter, не глобальным скрытием source gutter. Сворачивание всех списков/кода/таблиц этим не заявлено.

## Что записывать при каждом UI-изменении

- Реальные классы/data-атрибуты/владелец стилей и каноническое руководство.
- Токены, fallback/фиксированные размеры, порядок подключения/специфичность.
- Hover/focus/disabled/ошибки, клавиатура/доступные названия, узкий экран.
- Сохранённые/удалённые compatibility-селекторы и существенные изменения в месячном changelog.
- Раздельно исходники, тесты, build, публикация и историческая браузерная проверка. Старые window-маркеры не версии релиза и не приёмка текущего HEAD.

Менеджер тем/личные настройки и выполнение сторонних plugin settings не реализуются редактурой. Текущий незавершённый объём — THEME-ADAPTER-01, THEME-BROWSER-01, THEME-ASSETS-01, THEME-SELECTION-02 и остальные требования [backlog](next_steps.md#темы-и-безопасность-интерфейса).
