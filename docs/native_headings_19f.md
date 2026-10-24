# Заголовки — кандидат native-headings-19f

24.10.2026. Дополняет native_reveal_19e.md; задачи не переписываются. Пользователь принял 19e сообщением «вообще четко» в рамках раскрытия активного форматирования/кода и сохранности курсора. Это не полная регрессия и не предоставленные npm-логи. Требование заголовков остаётся отдельным до приёмки 19f.

## Изменение
Обычные ATX H1–H6 и Setext заголовки входят в нативный путь: текст не заменяется BlockWidget, первый клик обрабатывается CM. HeaderMark виден при курсоре внутри заголовка. Шрифтовые размеры/цвета оставлены существующему noteAppearance, чтобы не удвоить em-размер вложенными стилями. Setext underline не удаляет исходную строку; пустая отрисованная строка может сохраняться.

Кнопка fold — отдельный inline widget нулевой длины у начала заголовка, не замена текста. Использует прежний toggleHeading и его проверки, локальный SVG, data-wv-heading-fold/data-wv-view-only, aria-expanded/title/label, native keyboard button. Обычный текст не получает обработчика принудительного перемещения курсора. У закрытого раздела replace/atomic диапазон начинается в конце полного заголовка, а не в начале: скрывается тело, заголовок остаётся редактируемым. Вложенные anchors и переходы source/reading сохраняются существующим headingFolds. Reading DOM/кнопки не переписаны.

Контракт: .wv-native-heading-line, .wv-native-heading-anchor, button.wv-native-heading-button[aria-expanded], SVG currentColor; стили EditorView.baseTheme в native_text.js. Токены --wv-heading-fold-offset (fallback -24px), radius-s, text-muted/normal, background-modifier-hover, interactive-accent. Фиксированные размеры кнопки 20px/SVG16px сохранены по образцу прежней кнопки; readOnly disabled. Метка window.__WV_NATIVE_HEADINGS_TEST='native-headings-19f'.

## Границы и проверки
Заголовки со ссылками/wiki/BR/escape/entities пока сохраняют fallback 19d; первый клик там не объявляется исправленным. Остальные ограничения native_text_19d.md сохраняются. NATIVE-HEADINGS-01 реализуется частично для обычных заголовков, не закрывается до приёмки и переноса специальных конструкций.

8 изолированных кейсов eligibility/body boundary прошли у ассистента в Node. Интеграционные native_headings.test.mjs подготовлены, но не запускались. CM DOM, положение курсора и fold-control, полные npm test/build, Firefox/IIS не запускались. Кандидат, не принятый релиз. SQL/Web.config/source parser/зависимости/готовый bundle не меняются.

После pull из tools/cm6, каждый шаг после успеха предыдущего:

```powershell
npm test
node --test native_headings.test.mjs native_text.test.mjs heading_fold.test.mjs heading_fold_model.test.mjs source_markdown.test.mjs
npm run build
```

Обновить bundle и Ctrl+F5. Чек-лист: первый клик/ввод в середине обычных H1–H6 и Setext без возврата в начало; маркеры активного заголовка и вложенное форматирование; fold-кнопка мышью/Tab/Enter и без раскрытия/изменения текста; клик по заголовку закрытого раздела не перескакивает через него; вложенные закрытые разделы, режимы source/dynamic/reading и YAML folding; штатные номера, Undo/Redo/save/reopen, узкое окно/прокрутка. Отдельно проверить fallback заголовков со ссылками и не считать его исправленным. README/index/changelog не объявляют приёмку, глобальная сверка next_steps ещё не завершена.
