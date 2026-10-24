# Escape и сущности — кандидат native-literals-19h

24.10.2026. Дополняет source_mark_19g.md и native_headings_19f.md; прежние задачи не переписываются. Пользователь принял source-mark-19g сообщением «всё четко» в рамках предложенной проверки. Это не отчёт о полном npm-наборе/всех темах. После приёмки заголовков и source mark продолжается файл 01 — Текст.

## Изменение
Обычные текстовые абзацы/заголовки больше не переходят целиком в fallback из-за backslash escape или HTML-сущностей. Для AST Escape скрывается только исходный backslash, символ остаётся нативным. Для backslash HardBreak скрывается только backslash, не реальный newline. Курсор/выделение в диапазоне раскрывает локальный исходник без dispatch selection/changes.

AST Entity вне курсора заменяется маленьким inline span с декодированным текстом. Декодирование через существующий Markdown parser, не innerHTML/DOMParser. Виджет не перехватывает native events; при входе курсора/выделения в диапазон показывается запись &...;. Это не замена всей строки. Переводы строк в результате декодирования отклоняются, в частности &NewLine; остаётся исходным текстом; неизвестные/слишком длинные сущности не преобразуются принудительно. Inline/fenced/indented code не разбираются как escape/entity. Source не получает этих dynamic-замен, reading не меняется. Исходник сохраняется побайтно в пределах обычного механизма сохранения; комплект не нормализует содержимое заметки.

Существующий eligibility-тест обновлён под новое требование: escape/entities перенесены из fallback в native. Остальные старые проверки не удалены. Ссылки/wiki/изображения/BR и остальные контейнеры пока сохраняют прежние ограничения. Их точный первый клик, сноски, %% комментарии и теги этим комплектом не закрываются.

Контракт: .wv-native-entity, textContent и title, white-space:pre в EditorView.baseTheme; палитра/шрифт наследуются. Никакого исполнения HTML, новых сетевых запросов/зависимостей/SQL/Web.config или коммита bundle. Метка window.__WV_NATIVE_LITERALS_TEST='native-literals-19h'.

## Проверки
9 изолированных кейсов decoder-policy с parser-заглушкой прошли у ассистента в Node. Интеграционные native_literals.test.mjs подготовлены, но не запускались. Реальные Lezer node ranges, CM widget click/keyboard, heading folding, полный npm test/build и browser/Firefox/IIS не запускались. Кандидат до приёмки. editor.js/source parser не меняются.

После pull из tools/cm6, каждый шаг после успеха предыдущего:

```powershell
npm test
node --test native_literals.test.mjs native_text.test.mjs native_headings.test.mjs mark_highlight.test.mjs source_markdown.test.mjs
npm run build
```

Обновить bundle и Ctrl+F5. В 01 проверить все строки Экранирование и HTML-сущности: literal звёздочки/хеши/скобки не превращаются в разметку; &lt;div&gt; отображается текстом, &amp;/&copy;/&mdash;/&hellip;/&nbsp; корректны. Клик в обычный текст такой строки не возвращает курсор в начало и не раскрывает соседние строки; вход в escape/entity раскрывает только его. Проверить стрелки/выделение/копирование, backslash hardbreak, номера строк, заголовок с сущностями и folding, literal внутри code, режимы и Undo/Redo/save/reopen. Точную работу клика по самому inline-виджету проверить отдельно, не считать доказанной модельными тестами. README/index/changelog не объявляют приёмку, глобальная сверка next_steps ещё не завершена.
