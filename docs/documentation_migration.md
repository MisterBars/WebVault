# Реестр нормализации документации

[Продолжение и две очереди](handoff.md) · [История](../CHANGELOG.md) · [Правила переноса](changelog/README.md)

## База и критерии

Начальная база ревизии: 265a55448251b0002cfe4dc2f8b489fe9aa36162. База этой сверки: 4ad3b55c974fa3a3d598b492c68cc4d8ccbbd518, MisterBars/WebVault, main. Перед записью повторно проверять HEAD. Реестр временный: фиксирует охват, целевые места и пробелы, не заменяет changelog или функциональный backlog.

Один коммит — связанный этап с точным подтверждением payload и проверкой сохранённого GitHub-содержимого. Документы разрешено переписывать, объединять и переносить после сохранения уникальных сведений. История сначала переносится и проверяется в каноническом месте; технические требования, ограничения, задачи и процедуры — в профильных разделах. Затем допускается очистка дублей. Кандидат/коммит/тест/build/bundle/публикация/браузер различаются.

## Охват чтения и обхода

Полностью прочитаны README.md, index.md, четыре датированные передачи 22/24/24_late/25 октября, test_all_19j_fix.md, CHANGELOG.md, правила и октябрьский changelog, исходный архив README и checksum, first_install.md, deployment.md, npm_build.md, cm6_setup.md, github_transfer.md, account_security.md, folders_and_purge.md, документы 19a–19i, footnotes_20a/20b/20c/20d и footnotes_groups_20f, новые handoff.md/footnotes.md и этот реестр. Полное чтение не означает полную нормализацию каждого источника.

Прочитаны все SQL 00–07, Web.config.example, index.html, SetupStatusHandler.cs, health.ashx, editor.js, package.json, run_all_tests.mjs, footnote_model/syntax/reading/dynamic/sections/definition_groups, source_footnotes.js, source_markdown.js и heading_fold_ui.js. По этим источникам выполнена статическая сверка, не runtime-проверка.

Списки корня, docs и его подкаталогов changelog/archive/specifications/themes, tools/cm6, database/install и всего дерева src/WebVault.Web получены. В database/install и src/WebVault.Web отдельных Markdown/текстовых инструкций не обнаружено; содержимое кода/SQL всё равно служит техническим источником. Инвентаризация по именам не заменяет полное чтение остальных тематических документов, ТЗ и машинного аудита темы.

Ответ next_steps.md обрезался: документ НЕ прочитан целиком и не подлежит замене по фрагменту. Его известный blob — f3206da52316fb3674f08b7f2d034e1b23431840. Это ограничение получения текста, не отсутствующий хвост или устаревшее пользовательское вложение. Ранее предоставленный файл совпадал с репозиторным после CRLF→LF; повторно просить его только из-за обрезания нельзя.

Архив README прочитан, записанная SHA-256 известна, но исходные байты ещё не хешировались. Совпадение checksum не подтверждено. Замороженный архив не менялся и исключён из редакторской очистки согласно правилам changelog.

## Общая карта миграции

Пути без префикса относятся к docs. Статус относится только к указанному охвату; неперечисленная задача не считается отменённой.

| Источники | Каноническое место | Фактический статус / остаток |
| --- | --- | --- |
| ../README.md; index.md | Те же входы | Прочитаны; предметная навигация и удаление разговорных/датированных дополнений ещё не выполнены. |
| ../CHANGELOG.md; changelog/README.md; changelog/2026-10.md | Существующая схема changelog | Формат/вход нормализованы, история 19a–19i и 20a–20f перенесена в заявленном объёме; ранняя история ещё не полная. |
| changelog/archive/README_2026-10-22.txt; changelog/archive/README_2026-10-22.sha256 | Замороженный архив | Прочитаны; вычислительная проверка SHA-256 открыта, байты не менять. |
| first_install.md; deployment.md; npm_build.md; cm6_setup.md; github_transfer.md | Установка / сборка / обновление | Все прочитаны; first_install, npm_build, github_transfer нормализованы. Deployment и cm6_setup сохраняют историю/уникальные ограничения до переноса. Неясное ограничение ВВТ сохранено как открытый вопрос. |
| account_security.md; session_policy.md; password_change.md; users.md; user_management.md; ui_and_users.md | Аккаунты и сессии | Account_security прочитан; полное сведение остальных и сверка реализации открыты. |
| file_vault.md; folders_and_purge.md; trash_ui.md; multi_selection.md; note_transfer.md | Файлы / перенос | Folders_and_purge прочитан; не потерять различия корзины и удаления владельца, pending recovery, безопасность/лимиты. Остальные требуют полного чтения. |
| workspace_layout.md; unified_window.md; note_scrolling.md; mode_slider.md; editor_autosave.md | Рабочая область / редактор | Полное сведение открыто; сохранить guards, режимы, общую прокрутку и правила сохранения. |
| live_preview_blocks.md; markdown_text_19a.md; paragraph_lines_19b.md; widget_click_19c.md; native_text_19d.md; native_reveal_19e.md; native_headings_19f.md; source_mark_19g.md; native_literals_19h.md; hr_gutter_19i.md; editor_gutters.md; heading_folding.md | Редактор / Markdown | 19a–19i прочитаны, их история перенесена; остальные источники и предметное руководство ещё не сведены. Не возвращать нативный текст к BlockWidget. |
| wiki_links.md; wiki_links_15a.md; list_inline.md; list_inline_17b.md | Ссылки / списки | Полное чтение/перенос открыты; сохранить точные пути, подписи, клавиатуру и fallback. |
| tables.md; table_links_18b.md; table_source_align_18c.md; table_tasks_18d.md; table_stamp_delete_18e.md; table_structure_18f.md; table_hover_host_18g.md; table_axis_delete_18h.md | Таблицы | Полное чтение/перенос открыты; не выводить браузерную готовность 18h из коммита. |
| footnotes_20a.md; footnotes_20b.md; footnotes_20c.md; footnotes_20d.md; footnotes_groups_20f.md | footnotes.md + changelog | История перенесена, предметное руководство создано; ниже пофайловые пробелы. Старые источники пока нельзя очищать. |
| properties_panel.md; property_links.md; property_removal.md | Свойства | Полное чтение/сведение открыты; сохранить точечный YAML, историю, ограничения типов и глобальную схему как отдельную задачу. |
| note_graph.md | Граф / индекс | Полное чтение/сведение открыты; проверить лимиты, связи с подсказками, отделить планы. |
| theme_contract.md; theme_compatibility.md; theme_adapter.md; note_appearance.md; themes/minimal-8.1.7.md; themes/minimal-8.1.7.audit.json | Темы / контракт / аудит | Полная сверка открыта; аудит не равен подключению темы. Сохранить Firefox113, ресурсы, лицензии, opaque/e-ink. |
| API_OVERVIEW.md; db_schema.md; application_design.md; project_overview.md | Архитектура / API / БД | Полное чтение/сведение открыты; SQL прочитан, проектирование не считать реализацией. |
| specifications/001-webvault-v0.1.md; specifications/002-editor-files-and-accounts.md | Требования / backlog | Полное чтение и трассировка каждого уникального требования открыты. |
| TEST_CHECKLIST.md; test_all_19j_fix.md; профильные проверки | Тестирование + исторические результаты в changelog | Runner/fix сверены; единое руководство тестирования ещё не сформировано. |
| next_steps.md; handoff_2026-10-22.md; handoff_2026-10-24.md; handoff_2026-10-24_late.md; handoff_2026-10-25.md | next_steps.md + handoff.md | Очереди D/P разделены, передачи прочитаны; общий backlog не сведён полностью. Сохранить оба пакета боковой панели и все прежние задачи. |

## Матрица сохранности сносок

Полностью перечитаны пять источников и сохранённые footnotes.md/changelog на базе этой сверки. Это ручная содержательная сверка, не автоматическое доказательство покрытия каждого символа.

| Источник | Уже сохранено | Пробел до очистки |
| --- | --- | --- |
| footnotes_20a.md | История модели/фикса скобки и исторические тесты — changelog; нумерация, labels, UTF-16, Map, diagnostics, лимиты, диапазоны — footnotes.md | Добавить точный API resolveFootnotes: definitions/references, kind, результаты definitions/references/notes/diagnostics; body не парсится моделью; internal key не DOM id; лимиты модели не глобальные. |
| footnotes_20b.md | История opt-in/проверок — changelog; indent/bodyMap/CRLF, дубликаты и ограничения — footnotes.md | Добавить createSourceMarkdown(findFrontmatter,{footnotes:true}), default false, имена WVFootnote-узлов, Document-only eager parser перед LinkReference, сверку readers с AST, форму сегмента bodyMap. Сохранить проверки инкрементальных ranges/default opt-out/отсутствия заголовка из body/code folding и контроль сохранённых blob/окончаний без ослабления тестов. |
| footnotes_20c.md | История первого reading-подключения и проверок — changelog; snapshot/маска, literal fallback, безопасность, backlinks/details и текущие сценарии — footnotes.md | Добавить meta первого root-token/границу default parseDocument, FOOTNOTE_CSS/installMarkdownStyle и runtime-маркер reading; он появляется после входа в чтение и не доказывает тесты. |
| footnotes_20d.md | История изменения размещения — changelog; sections/подсветка/скрытые цели и LINKS-FRAGMENTS-01 — footnotes.md | Добавить runtime-маркер sections, отсутствие анимации/изменения высот, общие details внизу. Сохранить явное правило не менять политику первого упоминания молча. Уточнение wikiContext/# сверить по актуальному коду при нормализации ссылок; весь LINKS-FRAGMENTS-01 перенести в общий backlog без выбора неоднозначного заголовка. |
| footnotes_groups_20f.md | История и модельные проверки — changelog; группировка/selection/стрелки/guards/gutter — footnotes.md | Добавить отдельный StateField вместо индивидуальных пустых replacements, moveVertically/moveByChar и runtime-маркер групп; дополнить проверку наложения decorations/быстрых переходов. Факт, что 20f не менял editor.js, сохранить при исторической сверке. |

История 20e связана с реальным двухфайловым коммитом; отсутствующие обещанные тест/документ не выдаются за существующие. Регистрация nativeText.extension восстановлена отдельным коммитом 702aed18cbaf27640f38a86c5ca2248cbd7ea2ea; локальная синхронизация и побайтовое совпадение с резервной копией подтверждены предоставленным выводом. Это заменяет первоначальное указание реестра о незакоммиченном исправлении. Полный test:all/build/браузер для этой базы не зафиксированы.

## Ссылки и ограничения проверки

GitHub search_code для входящих ссылок с якорями на пять документов сносок вернул пустой список с incomplete_results=true. Это НЕ доказательство отсутствия якорей. До удаления файлов или смены их заголовков требуется полный обход ссылок/якорей; индексный поиск недостаточен. Имена старых файлов/содержание в этом этапе не меняются.

Действующие пути/scripts сверялись по прочитанному дереву и исходникам; общий автоматический аудит Markdown, ссылок, якорей, секретов и полноты задач ещё не выполнен. Неполный ответ инструмента не использовать для перезаписи недочитанного файла.

## Следующие действия

1. Закрыть перечисленные пробелы footnotes.md, перенести LINKS-FRAGMENTS-01 в канонический backlog после его полного чтения и проверить сохранённый результат.
2. Проверить полноту истории/требований и входящие ссылки, затем согласовать очистку старых источников сносок и навигации. Не удалять их только потому, что создан новый файл.
3. Продолжить полное чтение остальных документов/ТЗ/backlog и перенос истории этапов 15–18 и ранних функций.
4. Свести тематические руководства, архитектуру/API/БД и тестирование; обновить README/index и единственный актуальный handoff.
5. Выполнить повторный общий аудит сохранности требований, задач, ограничений, истории, ссылок/якорей/путей/команд и фактического GitHub diff.

Node-команды — из D:\project\WebVault\tools\cm6. Для функциональных изменений: адресные тесты, npm run test:all, только после успеха npm run build, затем отдельная браузерная проверка. Текущий документационный аудит эти команды, PowerShell/SQL/IIS/браузер не запускал. Не менять зависимости/lock/SQL/bundle под видом редакторской правки; не коммитить данные/секреты/рабочий Web.config/node_modules, не выполнять reset --hard/clean/force push или автоматическое сокрытие локальных изменений.
