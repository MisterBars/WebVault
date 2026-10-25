# Реестр нормализации документации

[Продолжение и две очереди](handoff.md) · [История](../CHANGELOG.md) · [Правила переноса](changelog/README.md)

## База и критерии

Начальная база: 265a55448251b0002cfe4dc2f8b489fe9aa36162. База этой сверки: 9fb849f149111c050d2f57ee35cd7667c71c3c4c, MisterBars/WebVault, main. Перед записью проверять HEAD. Реестр временный: после общей ревизии сохранить необходимые сведения в предметных руководствах/тестировании/backlog и удалить его. Новых реестров, архивов, отчётных файлов и переадресаций не создавать.

Работать пакетами: история — в changelog, требования/ограничения/API/процедуры/задачи — в предметных документах; после проверки сохранности действительно удалять дубли и обновлять входящие ссылки/якоря. Правило «только дополнять» отменено. Git-история не заменяет сверку. Очередь D не запускает P. Changelog содержит дату и суть нововведений/правок, не одобрения, переписку, локальную синхронизацию или подробный журнал тестов. Переносимые ниже результаты проверок сохраняются до сведения тестирования, не образуют постоянный второй changelog.

## Охват чтения и ограничения

Полностью читались README/index/handoff и передачи 22/24/24_late/25 октября; CHANGELOG, правила и полная редакция месяца; архив/checksum; first_install/deployment/npm_build/cm6_setup/github_transfer; все шесть источников аккаунтов и TEST_CHECKLIST; folders_and_purge; 19a–19i/19j/live_preview_blocks; пять источников сносок/footnotes; восемь источников таблиц/tables; project_overview и этот реестр. Чтение не означает нормализацию. Для текущего месяца начало получено GitHub get_file_contents (blob f2cf28e16a18c84e4f30b41130f5125db9781f60), строки 108–126 дополнены read-only выводом той же ревизии с TOTAL_LINES=126 и конечным маркером. Искажённый первый вывод хвоста не использовался как текст для записи.

Статически читались SQL 00–07, Web.config.example, index.html, SetupStatusHandler.cs, health.ashx, editor.js, package.json, run_all_tests.mjs, footnote_model/syntax/reading/dynamic/sections/definition_groups, source_footnotes.js, source_markdown.js, heading_fold_ui.js, markdown_renderer.js и основные модули таблиц. Для аккаунтов сверены AdminUsersHandler/UserManagementHandler/AccountHandler/AuthCrypto/WebApi, account_features.js, users.html и change_password.ashx; базы — в двух руководствах. Это не runtime.

Получены списки корня/docs/changelog/archive/specifications/themes/tools/cm6/database/install и дерева src/WebVault.Web. В database/install и src/WebVault.Web отдельных Markdown/текстовых инструкций не обнаружено. Имена не заменяют чтение ТЗ/документов/машинного аудита.

next_steps.md целиком в этой ревизии не прочитан и не нормализован: ответ обрезался. Нормализованный blob f3206da52316fb3674f08b7f2d034e1b23431840; исходное вложение raw blob 5db26d3346686b7863d2e1b432e542423eb0030c, 53163 байта. После CRLF→LF файл совпадал с репозиторием и заканчивается property-links-14. Отставал backlog, не вложение. Не выдумывать хвост, не просить повторно только из-за обрезания и не заменять по фрагменту.

Замороженные docs/changelog/archive/README_2026-10-22.txt и .sha256 исключены из очистки текста/ссылок. Записанная SHA-256: 46efaaa7be689360f1a88d86a1eb015ad71a1c0442e92e0f16280ecf819f182f. Исходные байты ещё не хешировались: вычисленное совпадение не подтверждено.

## Карта миграции

Пути ниже относятся к docs, кроме корневых README/CHANGELOG. Неперечисленное требование не отменено.

| Группа | Состояние / остаток |
| --- | --- |
| README; index; handoff | Предметная навигация и D/P согласованы в выполненном охвате. Полная нормализация входов и общий аудит открыты. |
| CHANGELOG; changelog/README; changelog/2026-10 | История 18a–18h, 19a–19i, 20a–20f, runner и шести событий аккаунтов 19–20 октября перенесена. Месяц очищается этим пакетом; установленная история не полная история проекта. Этапы 15–17 и ранние функции ещё открыты. |
| first_install; deployment; npm_build; cm6_setup; github_transfer | Первые/сборка/перенос нормализованы в указанном охвате; SQL 00–07/единый вход/аккаунты согласованы. Финальное сведение deployment/cm6_setup открыто; неясное ВВТ и уникальные ограничения сохранить. |
| Аккаунты | user_management и session_policy сведены, четыре дубля удалены. folders_and_purge оставлен для файловой группы. Последняя устаревшая формулировка месячного changelog устраняется этим пакетом. Наличие руководств не закрывает функциональную регрессию. |
| file_vault; folders_and_purge; trash_ui; multi_selection; note_transfer | Folders_and_purge прочитан; полное сведение открыто. Сохранить корзину/pending recovery/безопасность/лимиты и различие SQL-purge/неатомарной очистки владельца. |
| workspace_layout; unified_window; note_scrolling; mode_slider; editor_autosave | Полное сведение открыто; сохранить guards/режимы/общую прокрутку/черновики/сохранение. |
| live_preview_blocks; editor_gutters; heading_folding | Текст 19a–19i сведён, девять этапных документов удалены. Дальнейшее сведение gutter/folding открыто. |
| wiki_links; wiki_links_15a; list_inline; list_inline_17b | Полное чтение/сведение открыты; сохранить пути/подписи/клавиатуру/fallback. |
| tables | Восемь источников сведены, семь дополнительных удалены, служебная очистка выполнена. table_structure_model.test.mjs не существует; тест — table_structure.test.mjs. |
| footnotes | Пять источников удалены, руководство/история/Git-ссылки сохранены. Убрать последний устаревший абзац о будущем удалении. |
| properties_panel; property_links; property_removal; note_graph | Полное сведение открыто: точечный YAML/история/типы/глобальная схема/лимиты индекса/связи с подсказками. |
| theme_contract; theme_compatibility; theme_adapter; note_appearance; themes/minimal-8.1.7.md и .audit.json | Полная сверка открыта. Аудит не подключение; сохранить Firefox113/ресурсы/лицензии/opaque/e-ink. |
| API_OVERVIEW; db_schema; application_design; project_overview | Полное сведение открыто. Project_overview прочитан и обозначен ранним снимком, не полностью перенесён; SQL прочитан, проектирование не реализация. |
| specifications/001-webvault-v0.1; specifications/002-editor-files-and-accounts; next_steps; старые handoff | Полная трассировка открыта. Передачи не удалять до извлечения всех требований, включая оба пакета sidebar/Markdown. |
| Тестирование | TEST_CHECKLIST удалён после переноса 20 пунктов в session_policy; 19j fix — после контракта в npm_build. Общее руководство ещё не сведено; исторические результаты ниже сохранить при переносе. |

## Сохранность и фактические удаления

Сноски: API resolveFootnotes/diagnostics/Map/UTF-16/labels/лимиты, opt-in default false/WVFootnote/Document-only parser/AST/bodyMap/CRLF/indent/дубликаты, snapshot meta/default parseDocument/маска/literal fallback/безопасность/backlinks/details/FOOTNOTE_CSS, sections/подсветка/цели, StateField/groups/selection/guards/gutter/moveVertically/moveByChar/wrapped/bidi — в footnotes.md. LINKS-FRAGMENTS-01 открыта до полного backlog; fragment resolver не готовый picker/переход. Источники закреплены на b3c0fcfd9ada272183f7de62f0c43ccb06936edc. Удаления 20a/20b/20c/20d/20f: 22d7941d6e16411eb6052bb8ecf701d2f937f111, ff2d4c8307c518ffe33f5e070eaf1a400ac88b65, df287f7486c2b18d862adb29174a4563783bb7ad, 267903103cab82644fb729984f5aec77d52f5cf1, 22a8523fe82c07b9921645037eaccb3c13522b26. Пять удалены, одно руководство добавлено: сокращение 4.

Таблицы: ячейки/черновики/клавиатура/wiki-picker/source escaping/alignment/checkbox/UTC/stripTaskStampTokens/add/move/hover/headless host/удаление осей/ranges/CRLF/история/autosave/guards/DOM/CSS/runtime/тесты и ID TABLE-CELLS-01, TABLE-LINKS-01, TABLE-SOURCE-LINKS-01, TABLE-ALIGN-01, TABLE-TASKS-01, TABLE-STRUCTURE-01/02, TABLE-DELETE-01, TABLE-AXIS-DELETE-01 — в tables.md. Источники e5dea981b4a40ba6e6313ff3a305115b8902a6d3; история 4c0b345287c39215bb7a5a13c68502b7292d12fe; навигация/команды/metadata e832a9f9dfc68a01b061fbb0a8e3d654a4d7817f. Удаления 18b–18h: db6c54a8822075aa36c5f59972d7b95e9bb482b9, 031c98e5a8eb3244a75ded95fd0e51ef1725b85c, 506a8654322b8b459e99ea0f5c554be7b331263b, a9031f1fc0f90628b6bd913aefe0845acccb5637, 06c2b738b902fa69210fefea4510811ff6e8bf82, 5836a662478f38011a8f32a0900fb4ca6c308c53, ca6dbfdcd2429bcce34e3c6a267e2d5ed17ab2b2. Сокращение 7; служебные очистки a225f34/a2ad4e3/1be1785 выполнены. Произвольная вставка/multiline/TSV/matrix paste/несколько checkbox/полная регрессия остаются задачами.

Текст: сведение 6d4da7b84cad72314eb0e3a2216693b9649a3799, навигация 7bcd3004f4e2123f929176609c13448c42e762f6, ссылки 5deac6010b111b75d0708443bedc5d4542f3c03c, последнее из девяти удалений 4cc7df604409c4b80df1c57f568d537f1cebe3d9. Blob руководства e74183d534449e05f6b747fec4cfd8e56b2374ad; сокращение 9. Источники закреплены на 6d4da7b. 19c/revealAtPoint — fallback, не окончательное решение клика; не возвращать native text/code/headings в BlockWidget, не парковать курсор. Сохранены ranges/номера/folding/selection/Undo/Redo/autosave/guards/readOnly/draft; links/wiki/images/BR могут оставаться fallback; mark не selection, HR скрывает только номер разделителя.

Runner: контракт 1123b1ae234673e367835588c66dac9e52d06d43, удаление 6aaccba7dbdaeacc21d26cda986219b8745ec85a, сокращение 1. В npm_build сохранены independentTestEnv без NODE_TEST_CONTEXT независимо от регистра, неизменность env/PATH/NODE_OPTIONS родителя, исполнение fixture/код 1, TAP только захваченных fixture, test_all.test.mjs → test:all, отсутствие необходимости build/публикации для runner-only. Авторизация: 20 пунктов a7f229e65d635fd7c8d1dfb957dad9cf5e95fd63, указатель e3816d200454fa1b4b648c3cda0395eb109400df, удаление TEST_CHECKLIST 878c662e2cf81193edaf1337fee5ca902ce4e08d; сокращение 1. HTTP-коды/пороги — план, не пройденный прогон.

Аккаунты: user_management сводит создание/список/setup/management API/rowVersion/rename/soft delete/два purge/guards/ошибки/проверки/задачи (881ace4582f6c6e76232983571b8171c5fe04eeb); session_policy — profile/password/reset/MustChangePassword/лимиты/криптографию/аудит/сессии. README/deployment согласованы 3d8015b5f3b4b1f234adad09d55f15c962c09d21, index/first_install — 213b2e7d7bd7209178096f285e7cd6e14adf2cf1; история шести событий — cbf12e49294ae38e6c96f9b799ecb039286f14a8; служебная очистка — 94cfac4c44a7fd6c16e5273135ea869581deb09f; итоговые ссылки/реестр/ранний overview — 9fb849f149111c050d2f57ee35cd7667c71c3c4c. Сохранены различия валидации создания/rename, CreateSlot, отсутствие автоматического MustChangePassword/каталога, собственная текущая сессия против отзыва всех при административных действиях, неатомарность SQL/файлов. Исторические ссылки закреплены на 881ace4582f6c6e76232983571b8171c5fe04eeb; первоначальный management — 878c662e2cf81193edaf1337fee5ca902ce4e08d, не main.

Четыре удаления выполнены последовательно с проверками HEAD/полных diff: users.md — effa498f1e1af93fd580b90decf4933fe1ac97d0; ui_and_users.md — 42ed0d7cf3cdd5cc317c1d905ac85d4f5387cb67; account_security.md — 6b2a7ac30ada5d6724e4234f67b91de10f5ff547; password_change.md — 9281f299bc640764b72275a135933e996b393b19. Каталог подтвердил отсутствие четырёх и наличие двух руководств/folders_and_purge. Сокращение аккаунтов 4, новых файлов 0. Общий результат перечисленных групп 26, не изменение числа всех документов за всю ревизию. Последний устаревший статус о будущих удалениях убирается из changelog этим пакетом.

## Исторические проверки октября

Сведения перенесены из полной редакции changelog на базе 9fb849f, не являются новыми прогонами. Даты записей исходников не назначают даты недатированным наблюдениям. При финальном сведении тестирования перенести существенное в существующее каноническое руководство и убрать временный раздел вместе с реестром.

| Этап | Исторический охват и границы |
| --- | --- |
| 18a | 10 изолированных table_model и syntax checks; полный npm/build/CM/DOM/Firefox/IIS не запускались. Позже отмечались ручные ячейки/создание. Упоминание положительной list-inline-17b — отдельная ранняя история без назначенной даты. |
| 18b | 11 decoding/scope/catalog и syntax; picker вручную частично, source-дефект исправлен 18c; полного npm/build отчёта нет. |
| 18c | 12 source/caption/bounds/alignment/CRLF и syntax; 2 CM/parser подготовлены, не запускались. Позднее отмечались source links/alignment, не полный набор. |
| 18d | 10 изолированных и syntax 6 модулей/тестов; 3 интеграционных не запускались. Checkbox вручную работали, metadata был видим до 18e. |
| 18e | 12 metadata/removal/CRLF/stale-range и syntax; 2 renderer/минимальный-DOM не запускались. Позднее отмечались metadata/время/delete/Undo/Redo. |
| 18f | 14 модельных и syntax; 2 CM/parser не запускались. Ручные наблюдения выявили hover/focus Alt-дефекты, исправленные 18g. |
| 18g | 5 hover-helper и 1 checkbox с 6 host-кейсами, syntax. Полный импорт CM/исходный table_stamp_dom/wiring/native hover/drag/npm/build/Firefox/IIS не запускались; исходный тест не исключён, assertions не ослаблены. Позднее отмечалась ограниченная ручная проверка. |
| 18h | 10 модельных и syntax; 2 CM/parser не запускались. Реальные файлы b7a728b3b1e58468b179b17c01d7647120a4b88f; одноимённый 87b2b2eadcd508976f0f5f8570f75a7cadb50f88 в get_commit не показал изменений. TABLE-AXIS-DELETE-01 не закрыта коммитом. |
| 19a | 15 изолированных; последующая проверка выявила потерю конечного переноса/вторую строку, не завершённый BR. |
| 19b | 8 assertions с parser/DOM-заглушками; rendered-copy/геометрия отдельно, первый клик оставался проблемой. Нативные участки к старой схеме не возвращать. |
| 19c | 11 View-stub кейсов не доказали браузерное попадание; runtime-метка не доказывает исправление. |
| 19d / 19e | 12 изолированных, не DOM/интеграция; 5 markerScope, изменение прежнего ожидания соответствовало новой спецификации. |
| 19f / 19g | 8 boundaries/eligibility; 10 вычитания диапазонов, не Lezer/CM-интеграция и не все тематические слои. |
| 19h / 19i | 9 decoder-policy без реальных AST/CM ranges/клика; 9 изолированных HR, скрытие цифры не доказывает причину наложения соседних строк. |
| 20a / model fix | 12 изолированных; исходная запись потребовала скобку e732dae. 327/327 относятся к базе после runner до модели, 339/339 — после скобки до 20b; не текущий HEAD и не успех 20b–20f. |
| 20b | 9 helper/syntax; 6 source_footnotes подготовлены, не запускались без @codemirror/state; это не основание менять зависимости. |
| 20c | 5 mapping/masking и 4 inline-rule со заглушками/syntax; 5 integration/DOM-smoke подготовлены, полный pipeline/test:all/build/Firefox/IIS не запускался. Отмечалось появление в reading, навигация без подсветки не полная готовность. |
| 20d | 11 sections/syntax; настоящий DOM/test:all/build/Firefox/IIS не запускался. Отсутствие dynamic не дефект кеша. Локальные даты документов 20b–20d — 25 октября, UTC-коммиты — 24 октября. |
| 20e / 20f | В реальный двухфайловый 20e не вошли обещанные footnote_dynamic.test.mjs/docs/footnotes_dynamic_20e.md; не считать их существующими/прошедшими. 20f: 8 модельных/syntax, не настоящий CM/DOM/геометрия/wrapped/bidi/Firefox/IIS/test:all/build; editor.js не менял. Позднее отмечалась ручная группа сносок, не полная регрессия. |
| Runner | Причина ложного успеха воспроизведена в Node v20.20.1, не установлена Windows-специфичность. Первый полный исторический прогон: 52 файла/326 тестов/325 pass/1 fail, skipped/cancelled/todo нет. После фикса изолированная копия runner+test_all: 5 pass/0 fail, не полный WebVault. |
| Ранние UI | Создание свойств 7 браузерных пунктов; toolbar 5; padding/номера 7; Undo свойств 6, включая source. Общая прокрутка проверялась временной пробой и постоянным CSS. Chips/links/autocomplete имели ограниченный охват, не полную регрессию. Fold 11b исправлен до итогового наблюдения без ослабления строгой проверки, с регрессиями. |
| Аккаунты / поздний Markdown | Недатированные домашние наблюдения создания/серверного запрета обычной роли и rename/двух удалений — ограниченные, не полный npm/SQL/IIS отчёт. 26a0007 имел план сценариев, новый runtime-прогон при переносе не выполнялся; точный объём ранних замечаний/проверок не установлен. Поздняя передача 24 октября отмечает 19e–19i, передача 25 октября — группы сносок; это не полная готовность Markdown. |

Регистрация nativeText.extension восстановлена отдельным 702aed18cbaf27640f38a86c5ca2248cbd7ea2ea. Историческая синхронизация/побайтовое совпадение editor.js с резервной копией не подтверждают bundle или полный Node/build/браузер для той базы. Старые числа не переносить на текущий HEAD.

## Ссылки, ограничения и остаток

search_code с incomplete_results=true не доказывает отсутствие ссылок. Предоставленные полные git grep сносок b3c0fcf/e5dea981 и таблиц 4c0b345/ca6dbfd использованы в их пределах: реальные ссылки таблиц в index исправлены; после удалений остались текстовые имена реестра/исторического handoff, не относительные ссылки/якоря.

Адресный поиск аккаунтов по 9281f299bc640764b72275a135933e996b393b19 сначала обрезался/повторялся. Компактный повтор получен целиком, BEGIN/END, GREP_EXIT=0, MATCH_RECORDS=19 (не метрика полноты). Архив исключён; changelog содержит закреплённые Git-ссылки, руководства/реестр — текстовые источники. Рабочее указание project_overview:19 и устаревшее описание переноса истории deployment исправлены 9fb849f. Ссылка session_policy в handoff_2026-10-22 сохранена. Общий автоматический аудит Markdown/якорей/секретов/полноты задач ещё открыт; адресный grep его не заменяет.

Ограничения/задачи сохранить в руководствах и при полном чтении backlog: 19c не окончательное решение, native fallback для links/wiki/images/BR; Undo не переживает reload/reopen, native draft имеет отдельную семантику; YAML определяет типы, глобальная схема не реализована, quoted ISO date остаётся датой и ограничивает преобразование в текст. Folding списков/таблиц/кода/цитат и перенос прочих native folds при смене режима не закрыты headings-fold-11. Gutter-left не folding rendered blocks. Длительное хранение нескольких черновиков, inline-списки/checkbox/UTC не закрыты wiki/property-links событиями. Аудит Minimal не подключение темы/менеджера и не opaque/e-ink; совместимость со всем Obsidian/темами/плагинами не заявлена. CHANGELOG-UI-01/02/03 остаются задачами.

Далее полностью прочитать ТЗ/backlog; свести ссылки/списки 15–17, файлы/корзину/перенос, workspace/сохранение, свойства/глобальную схему, граф/индекс, темы/контракт/аудит, архитектуру/API/БД, тестирование, старые handoff, deployment/cm6_setup. Сохранить MD-COMMENTS-01, native fallback/block boundaries, оба sidebar-пакета, Файлы/Поиск/Закладки/resize/tools/drop, search options/suggest/history, tag chips → семантический поиск тега, bookmarks/ribbon order, навигацию/вкладки/split, безопасность/бэкапы/долгосрочные ТЗ. LINKS-FRAGMENTS-01 переносить после полного backlog, неоднозначные заголовки не выбирать молча; wikiContext/# сверить с кодом. Затем хеш исходных байтов архива, общий повторный аудит требований/истории/ссылок/якорей/путей/команд и удаление временного реестра.

Последний локальный снимок: fast-forward до 9fb849f149111c050d2f57ee35cd7667c71c3c4c, main/origin/main/origin/HEAD совпали, tracked/staged diff не показан, untracked src/WebVault.Web/assets/vendor/. Это не вечный status и не получение будущего коммита; vendor автоматически не трогать.

Среда: Windows7/.NET Framework4.5/классический ASP.NET/IIS/SQL Express2014/Firefox113, не Core. Node нужен на сборочном ПК, команды из D:\project\WebVault\tools\cm6. npm test — четыре файла; test:all — верхнеуровневые *.test.mjs, не вложенные/браузер. Функциональные изменения: адресные тесты → test:all → после успеха build → отдельная публикация bundle → браузер, с остановкой по LASTEXITCODE и без ослабления assertions.

В документационной серии ассистент не запускал Node/build/PowerShell/SQL/IIS/браузер; read-only Git выполнялся отдельно. Docs-only не требует сборки/публикации. Проверять ссылки/якоря/пути/команды/Markdown/сохранность/полный diff, не менять код/SQL/зависимости/lock/bundle и не коммитить данные/секреты/рабочий Web.config/node_modules. Не выполнять reset --hard/clean/force push/автоматический stash. После записей — точный SHA/состав/реальные удаления и добавления/ограничения/остаток/безопасные команды получения. Проценты экспертные; синхронизация их не повышает.
