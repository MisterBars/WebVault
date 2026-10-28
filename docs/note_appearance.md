# Выделение, типографика и подсветка

[DOM/CSS-контракт](theme_contract.md) · [Проект адаптера](theme_adapter.md) · [Аудит Minimal](themes/minimal-8.1.7.md) · [Проверки](npm_build.md) · [Backlog](next_steps.md)

## Область и статус

База адресной сверки —2dd2a83c9b7d462727027cf92fc07fe2500e5ccd: note_theme.js/note_theme_contract.js, obsidian-tokens.css, markdown_renderer.js, note_theme_contract.test.mjs/note_theme.test.mjs и package.json прочитаны полностью. Оформление реализовано в исходниках; раннее «не записано/кандидат» не текущий статус. Ограниченная ручная проверка23 октября сохранена в [документации проверок](npm_build.md#выделение-типографика-и-softbreak), не новый test:all/build/DOM/Firefox/IIS-прогон и не доказательство установленного bundle.

Компонент задаёт основной CM/DOM/native/reading selection, видимые маркеры, активную строку/совпадения и отдельные роли интерфейса/текста/редактора/кода. Не загружает Minimal, не создаёт менеджер тем или сохраняемые личные настройки.

## Роли и стабильные классы

create noteHighlighter использует27 tag→class сопоставлений HIGHLIGHT_ROLES через явный tagHighlighter и syntaxHighlighting, не светлый fallback defaultHighlightStyle. Стабильные классы: wv-md-heading/h1..h6/formatting/em/strong/strike/link/url/code/quote/list и wv-syntax-comment/meta/keyword/string/number/name/operator/punctuation/invalid. Bool разделяет wv-syntax-number. Неизвестный highlight tag не пропускается молча; случайные CM hash-классы не контракт адаптера. Поддержаны только теги текущей грамматики; новые языки/parser этим не добавляются. NoteAppearance также подключает отдельный markHighlight для source ==mark==.

| Роль | Зависимости/fallback |
| --- | --- |
| --wv-ui-font | --font-interface → --font-interface-theme → sans-serif |
| --wv-note-font | --font-text → --font-text-theme → sans-serif |
| --wv-editor-font | --font-editor → --font-text → --font-text-theme → sans-serif |
| --wv-code-font | --font-monospace → --font-monospace-theme → monospace |
| --wv-code-size | --code-size → --font-code →0.9em; это размер, не семейство |
| --wv-selection-background/text | --text-selection / --text-normal |
| --wv-markup-color/weight | --text-formatting → --text-muted /400 |
| --wv-active-line-background | --background-modifier-hover |
| --wv-note-weight/ui-heading-weight | 400 / --font-bold →600 |

Defaults находятся в раннем obsidian-tokens.css, не в позднем принудительном body-стиле поверх будущей темы. Цвета ссылок/strong/em/code и h1–h6 имеют семантические fallback; для заголовков поддержаны hN-font/size/weight/style/variant/line-height/color. UI h3 панели свойств/календарь не становятся Markdown-заголовками.

## Выделение и фон кода

.cm-editor.wv-themed-editor — root, style-id wv-note-appearance-style. Фон CM рисует .cm-selectionLayer .cm-selectionBackground через --wv-selection-background с scoped!important. Native input/textarea в .cm-content:focus получают собственные background/foreground ::selection, переопределяя system Highlight. Прозрачность native selection самих CM-строк, необходимая drawSelection, не отменяется.

У .cm-editor.wv-themed-editor .wv-md-code background:transparent: непрозрачный inline-фон закрывал нижний CM selection-layer. У отрисованных .wv-render code/pre остаётся --code-background с fallback background-secondary. Адаптер обязан различать фон поверхности/слоя и inline-декорации. Совпадения/активная строка оформлены отдельно; opaque/e-ink, foreground всех вторичных выделений и все фоновые слои тем не объявлены решёнными. Source mark и обычное selection — разные функции; [контракт текста](live_preview_blocks.md).

--text-formatting по умолчанию берёт --text-muted, не почти неразличимый старый meta #404740. Это defaults WebVault, не полная палитра Minimal. Штатный цвет selection не заменён бирюзовой темой: бирюзовый preview был только пробой смены токена. Контраст произвольных пользовательских цветов автоматически не гарантируется.

## Типографика, переносы и состояние документа

Interface-шрифт — для UI/подсказок/полей, note — для reading/прозы, editor — для CM с fallback на text, code — monospace. Шрифты/веса/размеры могут менять реальные высоты строк; margin/padding, source maps, реальные пустые строки и Markdown не переписываются ради вида.

Renderer создаёт настоящий BR для softbreak, не текстовый LF при white-space:normal. Это политика отображения, не добавление пробелов/новых строк в файл. Enter/Backspace, parser, реальные LF и сохранение не меняются этим оформлением; fence/code_block сохраняют буквальные LF в PRE/CODE, hardbreak не удваивается. Частные BR/fallback-контексты и регрессия — live_preview_blocks.md.

Изменение body class/style и событие document.fonts.loadingdone вызывают requestMeasure через WebVaultCM6.view при наличии редактора. Это не docChanged/новая транзакция текста, не очистка Undo и не команда autosave. Загрузка/наличие шрифта и геометрия проверяются отдельно.

## Диагностика и временный preview

installNoteAppearance устанавливает стиль один раз при отсутствии wv-note-appearance-style. Window-маркеры __WV_NOTE_THEME_TEST='note-theme-12', __WV_NOTE_THEME_FIX_TEST='code-selection-softbreak-12b', __WV_SOURCE_MARK_TEST='source-mark-19g' — исполненные диагностические ветки, не версии релиза/успешные тесты.

WebVaultAppearance.status() возвращает вычисленные fontFamily/fontSize/lineHeight/fontWeight/color/backgroundColor для editor/reading/properties/markup/drawnSelection либо null для отсутствующего узла, body textSelection/formatting и browserSupport для :has()/конкретной тестовой color-mix. Текст заметки не возвращается. Поля themeAdapterActivated:false и rawThemeAppliedByThisKit:false — границы этого комплекта, не аудит всех сторонних вмешательств страницы. refresh() запрашивает CM measure.

preview({selection,selectionText,markup,textFont,editorFont,interfaceFont,codeFont,textSize}) временно меняет только разрешённые inline-токены body:

- selection → --text-selection; selectionText → --wv-selection-text; markup → --wv-markup-color;
- textFont/interfaceFont/codeFont → --font-text-theme/--font-interface-theme/--font-monospace-theme; editorFont → --font-editor; textSize → --font-text-size.

createTokenPreview проверяет весь набор ролей/строк через CSS.supports до записи: неизвестная роль или недопустимое значение отклоняют пакет без частичного применения. При первой записи токена сохраняются исходные inline-значение и priority; повторный preview не затирает оригинал. resetPreview() восстанавливает сохранённые значения/priority, отсутствовавшее свойство удаляет и очищает saved. API возвращает temporary:true/список изменённых имён; не хранит настройки в БД/браузерном storage, не принимает remoteCSS/theme.css и не гарантирует контраст выбранной пары.

## Проверки и обновление

Текущий package.json уже содержит @lezer/highlight:^1.0.0. Историческая команда npm install --ignore-scripts относилась к явному добавлению зависимости; это не команда менять lock или устанавливать пакеты для редакторской/docs-only правки. Для функционального изменения действуют [npm_build.md](npm_build.md): адресные → test:all → build после успеха → отдельная публикация → браузер, LASTEXITCODE/строгие assertions. Если затронуты browser JS и defaults, публикуются согласованные новый bundle и assets/css/obsidian-tokens.css; SQL/Web.config/данные ради темы не менять.

Адресные файлы: note_theme_contract.test.mjs, note_theme.test.mjs и markdown_dom.test.mjs для renderer/softbreak, при изменении mark — mark_highlight.test.mjs. Файлы существуют по каталогу/чтению; этой ревизией не запускались. Исторические состав/числа и незапущенные проверки перенесены в npm_build.md; наличие теста и минимального fixture document не браузерная проверка.

План на копии заметки: CM/native/reading selection в тексте/коде/свойствах, видимые маркеры/secondary selection, активная строка/поиск, h1–h6/strong/em/code и UI отдельно, light/dark/узкий вид/длинные/wrapped строки, preview/reset с исходными priority/ошибочным пакетом, смена шрифта/measure без изменения документа/Undo/autosave, softbreak без изменения source/code LF, folding/gutter/календарь/меню и Firefox113 без внешних запросов. Это не выполненный чек-лист.

## Исторические свидетельства и ограничения

Подробные первоначальные проверки, расчёты контраста, дефекты selection/softbreak и ограниченная ручная проверка содержательно перенесены в [npm_build.md](npm_build.md#выделение-типографика-и-softbreak). Событие — в [месячной истории](changelog/2026-10.md#2026-10-23), где различены дата исходника и дата наблюдения. Здесь остаются технический контракт и воспроизводимый план, без второго журнала результатов.

Открытые THEME-ADAPTER-01/BROWSER-01/ASSETS-01/SELECTION-02 — в backlog, код/зависимости этим документальным пакетом не меняются.
