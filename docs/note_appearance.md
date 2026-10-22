# Выделение, типографика и подсветка — note-theme-12

[Контракт тем](theme_contract.md) · [Адаптер](theme_adapter.md) · [Аудит Minimal](themes/minimal-8.1.7.md).

Кандидат исправляет контраст основного CM/DOM выделения, focused input/textarea панели, активную строку/совпадения и явные шрифтовые роли. Вместо fallback подсветки, рассчитанной на светлый фон, используются 27 tag→class сопоставлений wv-md-* / wv-syntax-*. Шрифты, веса, размеры h1–h6, ссылки, strong/em и code опираются на CSS-переменные и fallback. Элементы интерфейса свойств/календаря не становятся заголовками Markdown. Новая типографика может менять фактическую высоту строк; margin/padding, реальные пустые строки, source maps и текст не переписываются.

Фон selection — --wv-selection-background → --text-selection, foreground native selection — --wv-selection-text → --text-normal. Для собственных CM-строк native прозрачность сохраняется, фон рисует слой. Scoped!important используется только для нужного selection painting и focused native fields, не для принудительного цвета всей заметки. Базовый --text-formatting → --text-muted вместо почти неразличимого default meta #404740. Это defaults WebVault, не полная палитра Minimal. Непрозрачное/e-ink выделение и foreground всех вторичных диапазонов требуют отдельной проверки адаптера.

Шрифты: interface (--font-interface), note (--font-text), editor (--font-editor с fallback), code (--font-monospace). --font-code в Minimal — размер и используется только в роли --wv-code-size. Заголовки используют --hN-font/size/weight/style/variant/line-height/color, код --code-normal/background и отдельные code-* цвета с fallback. Поддерживаются только теги, реально выдаваемые текущей грамматикой; новые парсеры/языки этим не добавляются.

Диагностика: window.__WV_NOTE_THEME_TEST='note-theme-12'; WebVaultAppearance.status() без текста заметки, refresh() для CM measure. preview({selection,textFont,editorFont,interfaceFont,codeFont,textSize,selectionText,markup}) временно меняет разрешённые inline-токены body, resetPreview() восстанавливает прежние значения/priority. Это не сохраняемые пользовательские настройки и не загрузка темы. Контраст произвольных пользовательских цветов автоматически не гарантируется. Смена темы/шрифта не создаёт docChanged и не должна влиять на undo/автосохранение.

Зависимость @lezer/highlight уже была транзитивной, теперь явно объявляется ^1.0.0; синхронизировать lock через npm install --ignore-scripts. После тестов build и Ctrl+F5. На другой компьютер переносить и новый bundle, и assets/css/obsidian-tokens.css.

Статус: кандидат. Ассистент разобрал реальный Minimal 8.1.7 через CSS AST, проверил синтаксис 4 новых файлов, CSS-синтаксис и 5 изолированных тестов контракта/preview. 3 теста реальной грамматики/CM подготовлены, здесь не запускались. Браузер/PowerShell/полный npm test/build не запускались. На базовой палитре контраст предполагаемого старого meta #404740 на #1e1e1e равен 1.74:1; default-маркера #a0a0a0 — 6.38:1, light #666 на #fff — 5.74:1. Это расчёт конкретных пар, а не измерение всех runtime-состояний/тем.


## Коррекция 12b: фон кода и один Enter
Пользовательская проверка note-theme-12 выявила две проблемы: фон исходных code-токенов маскирует лежащий ниже CM selection-layer (чёрные/тёмные прямоугольники вокруг выбранных символов), а softbreak, выводимый как текстовый LF при white-space:normal, не обеспечивает видимый перенос. Штатный цвет выделения пользователю подходит; бирюзовый preview был только проверкой смены токена и не устанавливается как тема.

Исправление: только у .cm-editor.wv-themed-editor .wv-md-code background становится transparent. У отрисованных .wv-render code/pre тематический фон сохраняется. Ни палитра selection, ни шрифтовые роли не заменяются новым фиксированным цветом. Softbreak в renderTokens становится явным BR; клавиатура Enter/Backspace, parser, исходные LF/пустые строки и сохранение не переписываются. В fence/code_block буквальные LF остаются текстом внутри PRE/CODE. Hardbreak не удваивается.

Добавлены 2 CSS-регрессии и 4 теста построения DOM с минимальным fixture document (не полноценный браузер). Ассистент проверил синтаксис новых тестов и CSS-регрессии на двух точных проверяемых правилах; полный renderer/CM/браузер здесь не запускался. Основная метка note-theme-12 остаётся; дополнительная window.__WV_NOTE_THEME_FIX_TEST='code-selection-softbreak-12b'. Комплект ещё не принят/не записан в Git.

### Приёмка note-theme-12 с коррекцией 12b
23.10.2026 пользователь подтвердил selection обычного текста/кода/полей/reading, видимые маркеры и шрифтовые роли, восстановленный softbreak без изменения Markdown и code LF, сохранность folding/gutter/календаря/истории. THEME-READABILITY-01 принят на базовой палитре в этом объёме. Полная Minimal/loader/менеджер/opaque-eink/вторичные foreground остаются отдельными задачами.
