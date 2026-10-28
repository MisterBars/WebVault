# Markdown: текст, код и динамический просмотр

[Указатель](index.md) · [История](changelog/2026-10.md) · [Сборка и проверки](npm_build.md) · [Сноски](footnotes.md) · [Таблицы](tables.md)

## Область и границы

Предметное руководство объединяет техническое содержание этапов 19a–19i и прежнего описания preview. Документы и основные исходники сверены на базе 1be1785bd209e02417d8275400a128f4e48ca57a. Это статическая сверка, не новый запуск Node, build или браузерная регрессия. История этапов и прежние результаты находятся в changelog; положительные ручные проверки 19e–19i не доказывают полную готовность Markdown.

Markdown в EditorState — источник данных. Оформление, раскрытие маркеров, исходные номера и view-only controls не должны переписывать заметку. Нельзя возвращать нативные текст/код/обычные заголовки к цельным или построчным BlockWidget ради косметики, принудительно парковать курсор или терять selection, Undo/Redo, autosave и сессионные guards.

Режимы source/dynamic/reading используют общее состояние заметки; обычное переключение не создаёт новый EditorState. Открытие другой заметки создаёт новое состояние, история Undo не обещается после повторного открытия/перезагрузки. Reading не разрешает свободное редактирование тела; редакторы свойств и checkbox имеют отдельные защищённые действия. При незавершённом черновике таблицы/свойств переходы и перестройка не должны терять ввод. Детали — в предметных руководствах.

## Нативный текст и локальное раскрытие

Обычные корневые абзацы, fence/code_block и допустимые заголовки в dynamic остаются нативным текстом CM с настоящими переводами строк. Клик, стрелки и выделение не проходят через revealAtPoint. Номера относятся к исходным строкам. Inline-форматирование оформляется декорациями StrongEmphasis, Emphasis, Strikethrough/WVStrike, InlineCode и WVHighlight. Source parser использует WVHighlight/WVStrike через Lezer delimiters без новых зависимостей; полную совместимость неоднозначных delimiters с markdown-it ещё требуется проверять.

Оба ограничителя активной конструкции показываются при курсоре внутри/на границе или пересечении непустого selection. Вложенный markerScope ищет ближайшего подходящего owner. Соседние конструкции не раскрываются целиком. Декорации меняют только видимость маркеров, не отправляют selection/changes ради раскрытия. Заменяемые маркеры не поглощают newline.

FencedCode при курсоре в теле раскрывает оба fence и CodeInfo. Строки кода получают оформление, буквальные Markdown-маркеры внутри кода не становятся форматированием. Это не новый подсветчик языков. Пустые исходные строки fence не удаляются; возможность визуально скрыть их целиком не реализуется этим контрактом. Пропуск кода стрелками нельзя автоматически объяснять atomicRanges: в editor.js этот слой относится к свойствам и закрытым разделам, а не обычному коду.

Основные интерфейсы: createNativeText({isLive,getBlocks,getHidden,getSections,onToggle}) возвращает field/extension; isNativeTextBlock выбирает нативный путь; markerVisible и markerScope управляют раскрытием; nativeHeadingBody вычисляет скрываемое тело раздела. Native field перестраивается при документе, selection и эффектах. В editor.js nativeText.extension зарегистрирован после decorations перед dynamicFootnotes.extension; восстановление регистрации закоммичено отдельно в 702aed18cbaf27640f38a86c5ca2248cbd7ea2ea.

## Заголовки и folding

Обычные ATX H1–H6 и Setext используют нативный текст. HeaderMark раскрывается при курсоре внутри заголовка. Размеры/цвета оставлены noteAppearance, чтобы не удваивать em-размер вложенными стилями. Setext underline не удаляет исходную строку; пустая визуальная строка может сохраняться.

Fold-кнопка — отдельный inline widget нулевой длины у начала заголовка, не замена текста. Использует toggleHeading, его guards и актуальный snapshot документа, локальный SVG и keyboard button. В закрытом нативном разделе скрывается тело от конца полного заголовка до границы раздела; заголовок остаётся редактируемым. Нельзя переносить начало replacement на начало заголовка и снова пропускать его курсором.

Раздел заканчивается перед следующим заголовком того же/более высокого уровня; вложенные флаги и согласование source/reading обслуживает существующий headingFolds. Reading DOM этим переносом не переписан. Панель свойств, YAML folding и контейнеры имеют собственные правила. Подробности состояния и сохранности — в [heading_folding.md](heading_folding.md); старое описание клика по цельному заголовку не заменяет нативный путь этого руководства.

NATIVE-HEADINGS-01 не закрывается наличием нативного пути для обычных заголовков: специальные fallback-конструкции и полный набор проверок остаются отдельным объёмом.

## Escape и HTML-сущности

Escape/entities сами по себе больше не переводят обычный абзац или заголовок целиком в fallback. Для AST Escape скрывается только backslash; для backslash HardBreak — backslash, не реальный newline. При входе курсора/selection раскрывается локальный исходный диапазон. Inline/fenced/indented code не декодируется как обычный текст.

AST Entity вне активного диапазона заменяется маленьким span с декодированным текстом, не всей строкой. decodeEntity(raw,parse) принимает запись с точкой с запятой длиной не более 64 символов, проверяет один текстовый inline-token одного абзаца и отвергает неизвестный/неизменённый результат и CR/LF, в том числе &NewLine;. Используется существующий Markdown parser, не innerHTML/DOMParser. Span заполняется через textContent/title, наследует палитру/шрифт и использует white-space:pre; ignoreEvent=false оставляет native events.

При курсоре/selection в диапазоне видна исходная запись &...;. Это не доказательство точного клика по самому inline-виджету: геометрия/keyboard/copy требуют браузерной проверки. Dynamic-замены не применяются к source; reading сохраняет свой renderer. Markdown не нормализуется этим отображением.

## BR и оставшийся fallback

Общий parser dynamic/reading распознаёт только <br>, <br/>, <br /> без атрибутов, без учёта регистра. Создаётся hardbreak token, renderer создаёт BR через createElement. html:false сохраняется: произвольный HTML, script и атрибуты не разрешаются. Code/escape/сущности не должны превращаться в HTML-перенос.

Один следующий LF/CRLF с необязательными пробелами перед ним поглощается только при разборе, чтобы BR плюс перевод исходной строки не давали два переноса. Два явных BR дают два. Softbreak и прочие hardbreak сохраняют свой смысл; исходник/maps не переписываются. MD-BR-01 требует проверки завершающего переноса и разных контекстов, не закрывается одной функцией распознавания.

Абзацы/заголовки с wiki, обычными ссылками, изображениями, html_inline или HTML BR могут оставаться fallback. Задачные аннотации wvTask/wvCellTask также исключаются из общего нативного пути; списки/таблицы имеют собственные редакторские модули. Не объявлять все контейнеры Markdown нативными.

Fallback paragraphRows может разделять корневой абзац на исходные строки только при совпадении inline tokens полного абзаца и отдельно разобранных строк, кроме переносов. Несовпадение, сложный контекст, trailing backslash или межстрочное форматирование сохраняют цельный fallback. Списки, таблицы, YAML, цитаты и заголовки этим helper не делятся; исходная parsed-структура для reading/folding сохраняется. Нативные участки не возвращать к этой схеме.

ensureBreakTails добавляет .wv-break-tail с aria-hidden=true и нулевой шириной только в DOM абзаца, заканчивающегося BR, чтобы пустая визуальная строка имела содержимое. Символ не записывается в Markdown/EditorState; копирование rendered DOM и фактическая высота требуют проверки. Reading-абзац остаётся цельным. Виртуальному продолжению BR не назначается выдуманный исходный номер.

revealAtPoint остаётся helper для BlockWidget fallback, не окончательным решением первого клика 19c. Сначала раскрывается диапазон без scrollIntoView, затем requestMeasure/posAtCoords пытаются определить позицию по clientX/clientY в пределах блока. Проверяются неизменность документа/selection, режима, заметки, пользователя и disabled; устаревшая коррекция отменяется. При отсутствии позиции остаётся начало блока. Это координаты раскрытого исходника, не точная карта каждого символа formatted DOM: высоты, переносы, шрифты и маркеры влияют на попадание. Helper не dispatch текстовых changes и не запускает autosave; drag, Shift-click, double-click и точность первого клика не считаются решёнными. Ссылки/folding/таблицы сохраняют собственные ветки.

## Source mark и обычное выделение

MD-MARK-SOURCE-01 относится к ==mark==, не к selection. noteAppearance подключает отдельный markHighlight: AST WVHighlight получает Decoration.mark по всему диапазону, включая видимые == в source. Слой не скрывает символы, не создаёт виджеты, не меняет курсор/Markdown и не выполняет серверных запросов. Code/frontmatter и незавершённые/неподдержанные конструкции не красятся глобальным regexp.

Непустые selection-диапазоны вычитаются из нового фонового слоя через unselectedParts, чтобы он не перекрывал штатное выделение; обычный курсор фон не снимает. ViewPlugin обновляется по документу, selection, viewport и транзакциям parser. Слой подключён в обоих редакторских режимах; dynamic скрывает свои маркеры через nativeText, reading использует DOM renderer. Это не исправление всех фоновых слоёв nativeText или всех тем.

## Исходные номера, HR и геометрия

Для BlockWidget/PropertiesWidget SourceBlockNumber использует GutterMarker и lineNumberWidgetMarker; номер вычисляется из editor.state.doc.lineAt(block.from).number. Многострочный fallback показывает первую исходную строку, раскрытый source — обычные построчные номера без второй колонки. Синтетическая панель без исходных строк возвращает null.

Только отрисованный BlockWidget с первым parser token hr получает явный пустой GutterMarker вместо цифры, не null с возможным штатным fallback. При раскрытии HR и в source его номер виден; reading новую нумерацию не получает. Политика основана на token type, не regexp по ---: Setext, code и вложенный hr не лишают номера свой контейнер. Source ranges, пустые строки и соседние номера не меняются.

Скрытие номера HR не меняет CSS-высоту, gutter transform, selection или folding и не доказывает устранение геометрической причины наложения. Если соседние реальные номера продолжают пересекаться, диагностировать высоты/позиционирование, а не скрывать следующие номера. Размещение gutter слева и его диагностика — в [editor_gutters.md](editor_gutters.md).

Для .cm-content .wv-render тема editor обнуляет только paddingTop/paddingBottom; общий renderer/reading и реальные пустые строки не меняются. inclusive:true сохранён для fallback replacements, но его самостоятельный вклад в прежнее исправление отступов не доказан.

Историческая граница layout: 22 октября на локальной базе 4f95412391f5b5cb709034060e2e6813f8e96a88 измерены padding 6px сверху/снизу и нулевые margin заголовков; после временного снятия padding высоты составили 51.1875px для первого и 38.390625px для остальных четырёх заголовков. Локальный editor.js отличался inclusive:true и диагностической меткой; application.css был лишь отформатирован и в комплект не входил. API проверялось с установленным @codemirror/view 6.43.15, не как основание обновлять зависимость. HANDOFF-LAYOUT-01/02 и 03/04 относятся к тому ограниченному комплекту: сохранённый локальный diff, сверка runtime/типов/параметров, замеры и семь ручных пунктов номера/отступов/раскрытия/Undo/source/reading. Это не текущая регрессия и не предоставленный npm test/build отчёт.

## Безопасность renderer и смежные функции

Reading и fallback preview используют общий markdown-it parser/DOM renderer. Разрешённые элементы создаются через DOM/textContent, не исполнение исходного HTML или штатный HTML renderer. Для обычных ссылок разрешены http/https/mailto; изображения в исходном контракте — текстовые заглушки без сетевой загрузки. Произвольный custom highlight callback не добавлен. Проверять отсутствие внешних запросов и блокирование javascript-ссылок отдельно.

Сноски, интерактивные задачи, свойства и wiki-навигация уже имеют отдельные модули: прежние утверждения об их полном отсутствии или обязательном Ctrl/Meta-клике в dynamic не являются актуальными инструкциями. См. [сноски](footnotes.md), [таблицы](tables.md), [списки](list_inline.md), [свойства](properties_panel.md), [wiki-ссылки](wiki_links.md), [индекс/граф](note_graph.md).

%% и HTML comments требуют отдельной реализации/сверки MD-COMMENTS-01; локальные защиты picker не означают полноценные комментарии Markdown. Не обещаются полная совместимость Obsidian, произвольные плагины, math/Mermaid/Dataview или загрузка вложений на основании preview. Callout в исходном контракте — оформление цитаты без самостоятельной fold-семантики; folding контейнеров остаётся отдельным объёмом. Delete/Ctrl+A дерева файлов не исправляются редактурой этого руководства. При проблеме dynamic использовать source, не редактировать заметки вручную через SQL.

## Реализация и DOM/CSS

Основные файлы tools/cm6: editor.js, native_text.js/native_text_model.js, source_markdown.js, markdown_renderer.js, paragraph_preview.js, widget_click.js, mark_highlight.js/mark_highlight_model.js, source_widget_number.js; оформление note_theme.js, состояние heading_fold_state.js и heading_fold_ui.js.

Классы native: .wv-native-strong, .wv-native-em, .wv-native-strike, .wv-native-code, .wv-native-highlight, .wv-native-code-line, .wv-native-entity. Mark использует .wv-source-mark с --text-highlight-bg (fallback #7b682d), color inherit; code — --font-monospace/--background-secondary.

Заголовки: .wv-native-heading-line, .wv-native-heading-anchor, button.wv-native-heading-button[aria-expanded], data-wv-heading-fold/data-wv-view-only. EditorView.baseTheme задаёт нулевую ширину anchor, кнопку 20px/SVG 16px, --wv-heading-fold-offset (fallback -24px), radius-s, text-muted/normal, background-modifier-hover и interactive-accent. SVG currentColor, клавиатурный focus-visible, readOnly disabled; полная совместимость тем не доказана.

Диагностические window-маркеры: __WV_LAYOUT_TEST='layout-padding0-widgetnumbers-02'; __WV_PARAGRAPH_TEST='paragraph-lines-19b'; __WV_WIDGET_CLICK_TEST='widget-click-19c'; __WV_NATIVE_TEXT_TEST='native-text-19d'; __WV_NATIVE_TEXT_REVEAL_TEST='native-reveal-19e'; __WV_NATIVE_HEADINGS_TEST='native-headings-19f'; __WV_SOURCE_MARK_TEST='source-mark-19g'; __WV_NATIVE_LITERALS_TEST='native-literals-19h'; __WV_HR_GUTTER_TEST='hr-gutter-19i'. Они относятся к соответствующим исполняемым веткам загруженного JS, не являются версией релиза или результатом теста. Наличие старой метки 19c не доказывает исправленный fallback.

## Воспроизводимые проверки

Команды для функционального изменения текста, не требование сборки при docs-only. Наличие перечисленных файлов проверено в tools/cm6; сами тесты этой ревизией не запускались. Не удалять старые проверки и не ослаблять assertions ради зелёного результата. Из D:\project\WebVault\tools\cm6:

```powershell
& {
    Set-Location D:\project\WebVault\tools\cm6
    $tests = @(
        'markdown_br.test.mjs', 'markdown_dom.test.mjs',
        'paragraph_preview.test.mjs', 'widget_click.test.mjs',
        'native_text.test.mjs', 'native_headings.test.mjs',
        'native_literals.test.mjs', 'mark_highlight.test.mjs',
        'source_markdown.test.mjs', 'source_widget_number.test.mjs',
        'heading_fold.test.mjs', 'heading_fold_model.test.mjs',
        'note_theme.test.mjs'
    )
    node --test @tests
    if ($LASTEXITCODE -ne 0) { throw 'Targeted text tests failed; stop' }
    npm run test:all
    if ($LASTEXITCODE -ne 0) { throw 'Full suite failed; do not build' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed; do not publish' }
}
```

npm test запускает сокращённый набор, не заменяет test:all. Полный runner охватывает верхнеуровневые *.test.mjs, не браузер и не автоматически вложенные тесты. Node нужен на сборочном ПК, не для запуска сайта. Не обновлять зависимости/lock без основания; untracked vendor автоматически не коммитить. После функциональной сборки нужна отдельная публикация bundle по npm_build.md и Ctrl+F5; корень Git/docs/tools в IIS не публикуются.

После успешных тестов и отдельной публикации на копии заметки проверить:

1. Первый клик/ввод в начале, середине и конце plain/strong/emphasis/strike/mark/inline code; курсор не возвращается в начало. Оба ограничителя активной конструкции видны, соседние остаются скрытыми. Вложенные/неоднозначные delimiters проверить отдельно.
2. ArrowUp/Down входит в код сверху/снизу и позволяет редактировать каждую строку. Fence/info раскрываются внутри и скрываются снаружи, буквальные маркеры и пустые исходные строки сохранны.
3. H1–H6 и Setext: точный клик, вложенное форматирование, fold мышью/Tab/Enter, закрытый заголовок остаётся доступным; parent/child, source/dynamic/reading, YAML и обычный code folding не регрессируют. Отдельно фиксировать дефекты специальных fallback-заголовков.
4. Все BR-варианты, два подряд, завершающий BR, BR плюс LF/CRLF/пробелы, обычный softbreak/двухпробельный/backslash break. Reading не добавляет лишний промежуток; виртуальной строке не присваивается номер. Code/escape и HTML с атрибутами не исполняются.
5. Двухстрочный и сложный fallback, межстрочные ссылки/форматирование: не теряются tokens/номера/содержимое. Первый клик, быстрые повторные клики, stale requestMeasure, drag/Shift/double-click, длинные/wrapped строки, scroll и высоты проверяются реально, не по View-заглушке.
6. Escape звёздочек/хешей/скобок остаётся literal; &lt;div&gt;, &amp;, &copy;, &mdash;, &hellip;, &nbsp; отображаются текстом. &NewLine;/неизвестные/длинные entities не преобразуются принудительно. Курсор/selection/copy по entity, backslash hardbreak, code и заголовок с entity/folding.
7. Source ==mark== с вложенным форматированием и несколькими выделениями: фон виден, == остаются; selection читается поверх фона, code/YAML/незакрытые конструкции не красятся ошибочно. Проверить свою тему и dynamic/reading отдельно.
8. Отрисованный HR без цифры, раскрытый/source HR с номером. Соседние пустые/текстовые строки, Setext/code/таблицы/свойства сохраняют номера; наложение соседних номеров диагностировать отдельно.
9. Нативное выделение через строки, IME, Enter/Backspace, копирование rendered DOM с .wv-break-tail, большой документ/перестройка высот/прокрутка. Не сериализуются служебные символы, маркеры и номера.
10. Undo/Redo, autosave/save/reopen и смена режимов сохраняют исходник. Свойства/календарь, ссылки при dirty/ошибке/404, таблицы/checkbox/списки/сноски/gutter/folding не регрессируют. ReadOnly, busy, черновики, смена заметки/сессии, удаление открытой заметки и устаревшие callbacks не обходят guards. Firefox 113, CM DOM и отсутствие внешних запросов проверяются отдельно от Node.

## Открытые задачи

Сохранены MD-BR-01, MD-MARK-SOURCE-01 и NATIVE-HEADINGS-01 с указанными границами; наличие кода не заменяет сверку статуса и регрессию. Продолжение native fallback для links/wiki/images/BR не должно ломать существующую навигацию/редакторы или возвращать обычный текст в BlockWidget. MD-COMMENTS-01 и MD-BLOCK-BOUNDARIES-01 остаются отдельными задачами; блоки с четырьмя пробелами/цитаты/сноски нельзя смешивать или сливать через пустые строки. Теги, heading/block links, дополнительные folding-контейнеры и файловые команды не закрываются текстовой консолидацией.

Полный объём LINKS-FRAGMENTS-01 сохранён в [каноническом backlog](next_steps.md#ссылки-и-адресация); связанный контракт сносок — в [footnotes.md](footnotes.md#открытые-задачи). Наличие fragment resolver не доказывает готовность heading-picker, позиционирования или переходов без потери Undo.

Общий next_steps.md уже полностью прочитан и предметно переработан; это не завершение полной трассировки требований обоих ТЗ/backlog по реализации, подключению и проверкам всего проекта. Общая ревизия остаётся открытой; отсутствие задачи в этом руководстве не означает её отмену.
