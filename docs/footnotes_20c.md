# Видимые сноски в чтении — кандидат footnotes-reading-20c

25.10.2026. Дополняет footnotes_20a.md/footnotes_20b.md. Пользователь сообщил отсутствие ошибок после 20b; отсутствие изменений сайта было ожидаемо для opt-in подготовительного этапа. Старые требования не переписываются.

20c подключает фактическую точку renderHeadingReading: source snapshot передаётся в meta первого root-token, строится reading-only план, definitions маскируются в отдельной копии с сохранением UTF-16 длины/EOL, а Markdown-it создаёт wv_footnote_ref только по точному AST-диапазону. Исходник/EditorState/selection не изменяются. Task/table annotations по-прежнему вычисляются по оригинальному тексту, не по маске. Default parseDocument сохраняет прежние tokens/maps и добавляет только внутренний source snapshot; dynamic/source не получают нового отображения сносок.

В чтении — superscript, общий ordered list внизу, повторные упоминания с отдельными backlinks, inline notes, rich Markdown body через прежний безопасный renderer. Фрагменты body не становятся YAML-панелями или новым вложенным набором сносок. HTML выключен, текст не вставляется через innerHTML. DOM IDs только из scope/номера/occurrence, не из label. Переходы ограничены текущим render-root, не меняют URL fragment, не открывают другие заметки. Ссылки на заметки в body используют прежний onNote/его guards.

Folding заголовков сохраняется по исходным from/to. Appendix глобальный, не скрывается вместе с разделом. Если backlink ведёт к упоминанию внутри закрытого раздела, выводится статус с предложением развернуть раздел; автоматическое раскрытие ещё не реализовано. Неиспользованные/повторные определения сохраняются в details исходным текстом, когда reading-план имеет доступ к snapshot; документ только из неиспользованного определения без root-token может сохранять прежнее пустое отображение. Невозможно сопоставить inline source — ссылка остаётся literal, номер не угадывается. Footnotes внутри table cells, обычных ссылок/изображений, вложенные definitions и %% comments пока не объявлены поддержанными.

Контракт: .wv-footnotes, .wv-footnote-reference, .wv-footnote-backlinks, .wv-footnote-status; CSS в installMarkdownStyle через FOOTNOTE_CSS. Токены text-muted/interactive-accent, наследуемая типографика. role doc-noteref/endnotes/endnote/backlink, status и локальные focus targets. Метка window.__WV_FOOTNOTES_READING_TEST='footnotes-reading-20c' появляется после входа в чтение.

У ассистента прошли 5 изолированных проверок mapping/masking и 4 проверки inline-rule со state-заглушкой; синтаксис нового runtime и тестов проверен Node. Полный parser/DOM pipeline с Markdown-it/CodeMirror, полный npm test:all/build и Firefox/IIS здесь не запускались. Пять интеграционных/DOM-smoke тестов подготовлены. Кандидат до проверки пользователя; MD-FOOTNOTES-01 целиком не закрыта.

После pull из tools/cm6, по очереди после успеха предыдущего:

```powershell
npm run test:all
npm run build
```

Обновить bundle на сайте, Ctrl+F5, переключиться именно в чтение. Проверить 01: первая/вторая/повторная/inline сноски дают номера 1/2/1/3; внизу 3 пункта, у первой два backlinks; во второй сохранены несколько абзацев, жирный и код. Клик туда/обратно и Tab/Enter, folding/статус скрытого target, свойства и обычные links/table checkbox, source без изменения текста, dynamic без отката курсора. Следующий этап — нативные сноски в dynamic. Зависимости/SQL/Web.config/готовый bundle не коммитятся. После записи перечитать JS/test файлы и проверить сохранность окончания файлов.
