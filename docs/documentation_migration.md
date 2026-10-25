# Реестр нормализации документации

[Продолжение и две очереди](handoff.md) · [История](../CHANGELOG.md) · [Правила переноса](changelog/README.md)

## База и критерии

Начальная база: 265a55448251b0002cfe4dc2f8b489fe9aa36162. База сверки: 849cbcd6c76d8a4b8c235151b463e9f48b54ddba, MisterBars/WebVault, main. Перед записью проверять HEAD. Реестр временный: после общей ревизии сохранить нужное в руководствах/тестировании/backlog и удалить его. Не создавать новые реестры/архивы/отчёты/переадресации.

Работать пакетами: история — changelog, требования/ограничения/API/процедуры/задачи — предметные документы, затем реальные удаления/ссылки/якоря. Правило «только дополнять» отменено. Git не заменяет содержательную сверку. D не запускает P. В changelog дата/суть изменений, без одобрений/переписки/локальной синхронизации/внутренних номеров вместо смысла. Исторические результаты ниже временные до сведения тестирования, не постоянный второй журнал.

## Охват чтения и ограничения

Полностью читались README/index/handoff и передачи 22/24/24_late/25 октября; CHANGELOG/правила/месяц/архив/checksum; first_install/deployment/npm_build/cm6_setup/github_transfer; шесть аккаунтных источников/TEST_CHECKLIST; folders_and_purge; 19a–19i/19j/live_preview_blocks; пять источников сносок/footnotes; восемь таблиц/tables; project_overview; оба ТЗ; properties_panel/property_links/property_removal; wiki_links/wiki_links_15a; list_inline/list_inline_17b; этот реестр. Чтение не полная нормализация. Месяц до очистки: blob f2cf28e16a18c84e4f30b41130f5125db9781f60, начало GitHub + read-only строки 108–126 той же ревизии, TOTAL_LINES=126; испорченный кодировкой хвост не использован. После очистки месячный diff проверен целиком.

Прежний next_steps полностью прочитан на 4d80a0110eb3eb1d88ffbf65b14ae2fa9d33d5d0: начало GitHub + read-only строки 207–238 с маркерами и TOTAL_LINES=238. Конец property-links-14, не потерянный хвост. Прежний нормализованный blob f3206da52316fb3674f08b7f2d034e1b23431840, raw вложение 5db26d3346686b7863d2e1b432e542423eb0030c/53163 байта; совпадение после CRLF→LF сохраняет исторический смысл, не утверждение о новом blob после переписывания. Не запрашивать повторно старый файл из-за обрезания.

849cbcd6c76d8a4b8c235151b463e9f48b54ddba записал ровно next_steps.md/handoff.md, не этот реестр. Backlog переписан предметно с прежними ID, поздними Markdown/sidebar/search требованиями, LINKS-FRAGMENTS-01 и долгосрочными ТЗ. Handoff ссылается на backlog вместо копии P. Оба полных diff проверены: 130 добавленных/264 удалённые строки. Полная трассировка всех профильных требований и сверка кода остаются открытыми. Два ТЗ согласуются этим пакетом как требования, не вечные статусы «не начато»/«всё готово».

Статически читались SQL00–07, Web.config.example/index.html/SetupStatusHandler/health.ashx/editor.js/package.json/run_all_tests, модули footnote model/syntax/reading/dynamic/sections/definition_groups, source_footnotes/source_markdown/heading_fold_ui/markdown_renderer и основные таблицы; аккаунты AdminUsersHandler/UserManagementHandler/AccountHandler/AuthCrypto/WebApi/account_features/users.html/change_password.ashx. Базы — в руководствах; не runtime. Получены списки корня/docs/changelog/archive/specifications/themes/tools/cm6/database/install и дерева src/WebVault.Web. В database/install/src/WebVault.Web отдельных Markdown/текстовых инструкций не обнаружено; имена не заменяют чтение остальных документов/машинного аудита.

Заморожены docs/changelog/archive/README_2026-10-22.txt и .sha256, исключены из очистки текста/ссылок. Записанная SHA-256 46efaaa7be689360f1a88d86a1eb015ad71a1c0442e92e0f16280ecf819f182f; исходные байты ещё не хешировались, вычисленное совпадение не подтверждено.

## Карта миграции

Пути относятся к docs, кроме корневых README/CHANGELOG. Неперечисленное требование не отменено.

| Группа | Состояние / остаток |
| --- | --- |
| README/index/handoff | Навигация/D/P согласованы в выполненном охвате, handoff переписан 849cbcd; полная согласованность входов/общий аудит открыты. |
| CHANGELOG/changelog/README/2026-10 | История таблиц/текста/сносок/runner/шести событий аккаунтов перенесена; очистка 654b220149a92b5209a67f3a5d6c3a5da61488dc, номера убраны/правила обновлены 4d80a0110eb3eb1d88ffbf65b14ae2fa9d33d5d0. Ранние ссылки/списки/функции ещё не полностью реконструированы. |
| first_install/deployment/npm_build/cm6_setup/github_transfer | Установка/сборка/перенос согласованы с SQL00–07/единым входом/аккаунтами в проверенном объёме; финальное сведение deployment/cm6_setup и неясное ВВТ открыты. |
| Аккаунты | Два руководства сведены, четыре дубля удалены; folders_and_purge оставлен для файлов. Последний статус будущих удалений устранён 654b220, функциональная регрессия не закрыта. |
| file_vault/folders_and_purge/trash_ui/multi_selection/note_transfer | Полное сведение открыто; сохранить корзину/pending recovery/лимиты/безопасность и SQL-purge против неатомарной очистки владельца. |
| workspace_layout/unified_window/note_scrolling/mode_slider/editor_autosave | Полное сведение открыто: guards/режимы/прокрутка/черновики/сохранение. |
| live_preview_blocks/editor_gutters/heading_folding | Текст сведён, девять этапных удалены; дальнейшее сведение gutter/folding открыто. |
| wiki_links/wiki_links_15a/list_inline/list_inline_17b | Полностью прочитаны; задачи сопоставлены с backlog, предметное сведение/история/удаления ещё не выполнены. |
| tables | Восемь в один, семь удалены, служебная очистка выполнена. table_structure_model.test.mjs нет; тест table_structure.test.mjs. |
| footnotes | Пять источников удалены, контракт/история сохранены. LINKS-FRAGMENTS-01 теперь есть в backlog; убрать устаревший финальный абзац о будущих удалениях при связанной очистке, не теряя контракты. |
| properties_panel/property_links/property_removal/note_graph | Три источника свойств полностью прочитаны, дубли backlog сверены; нормализация руководств/глобальная схема/индекс/граф ещё открыты. |
| theme_contract/theme_compatibility/theme_adapter/note_appearance/themes/minimal-8.1.7.md и .audit.json | Полная сверка открыта; аудит не подключение, сохранить Firefox113/ресурсы/лицензии/opaque-eink. |
| API_OVERVIEW/db_schema/application_design/project_overview | Полное сведение открыто; overview ранний снимок, не полностью перенесён; SQL прочитан, проектирование не реализация. |
| specifications/001 и 002/next_steps/старые handoff | Всё прочитано; основные требования сведены предметно в backlog, статусы двух ТЗ согласуются этим пакетом. Требования и критерии не отменены. Полная трассировка оставшихся источников/удаление старых передач ещё открыты. |
| Тестирование | TEST_CHECKLIST/19j fix удалены после переноса в session_policy/npm_build; общее руководство и перенос свидетельств ниже ещё открыты. |

## Сохранность и фактические удаления

Сноски: API resolveFootnotes/diagnostics/Map/UTF-16/labels/лимиты, opt-in default false/WVFootnote/Document-only parser/AST/bodyMap/CRLF/indent/дубликаты, snapshot meta/default parseDocument/маска/literal fallback/безопасность/backlinks/details/FOOTNOTE_CSS, sections/цели/подсветка, StateField/groups/selection/guards/gutter/moveVertically/moveByChar/wrapped-bidi — footnotes.md. Fragment resolver не picker. Источники b3c0fcfd9ada272183f7de62f0c43ccb06936edc. Удаления 20a/20b/20c/20d/20f: 22d7941d6e16411eb6052bb8ecf701d2f937f111, ff2d4c8307c518ffe33f5e070eaf1a400ac88b65, df287f7486c2b18d862adb29174a4563783bb7ad, 267903103cab82644fb729984f5aec77d52f5cf1, 22a8523fe82c07b9921645037eaccb3c13522b26. Пять удалены/одно добавлено, сокращение4.

Таблицы: ячейки/черновики/клавиатура/wiki-picker/source escaping/alignment/checkbox/UTC/stripTaskStampTokens/add-move-hover/headless host/оси/ranges/CRLF/история/autosave/guards/DOM/CSS/runtime/тесты и TABLE-CELLS-01, TABLE-LINKS-01, TABLE-SOURCE-LINKS-01, TABLE-ALIGN-01, TABLE-TASKS-01, TABLE-STRUCTURE-01/02, TABLE-DELETE-01, TABLE-AXIS-DELETE-01 — tables.md. Источники e5dea981b4a40ba6e6313ff3a305115b8902a6d3, история 4c0b345287c39215bb7a5a13c68502b7292d12fe, навигация/команды/metadata e832a9f9dfc68a01b061fbb0a8e3d654a4d7817f. Удаления18b–18h: db6c54a8822075aa36c5f59972d7b95e9bb482b9, 031c98e5a8eb3244a75ded95fd0e51ef1725b85c, 506a8654322b8b459e99ea0f5c554be7b331263b, a9031f1fc0f90628b6bd913aefe0845acccb5637, 06c2b738b902fa69210fefea4510811ff6e8bf82, 5836a662478f38011a8f32a0900fb4ca6c308c53, ca6dbfdcd2429bcce34e3c6a267e2d5ed17ab2b2. Сокращение7; служебные a225f34/a2ad4e3/1be1785 выполнены. Произвольная вставка/multiline/TSV/matrix paste/несколько checkbox/регрессия открыты.

Текст: сведение6d4da7b84cad72314eb0e3a2216693b9649a3799, навигация7bcd3004f4e2123f929176609c13448c42e762f6, ссылки5deac6010b111b75d0708443bedc5d4542f3c03c, последнее удаление4cc7df604409c4b80df1c57f568d537f1cebe3d9. Девять удалены/каталог проверен, сокращение9; blob руководства после сведения e74183d534449e05f6b747fec4cfd8e56b2374ad. Источники6d4da7b. Reveal-helper не решение клика; native text/code/headings не возвращать в BlockWidget/парковку. Ranges/номера/folding/selection/Undo/Redo/autosave/guards/readOnly/draft сохранены; links/wiki/images/BR fallback, mark не selection, HR только свой номер.

Runner: контракт1123b1ae234673e367835588c66dac9e52d06d43, удаление6aaccba7dbdaeacc21d26cda986219b8745ec85a, сокращение1. В npm_build independentTestEnv без NODE_TEST_CONTEXT независимо от регистра, неизменность env/PATH/NODE_OPTIONS родителя, fixture реально исполняются/код1, TAP только захваченных fixture, test_all.test.mjs → test:all, runner-only без build/публикации. Авторизация: 20 пунктов a7f229e65d635fd7c8d1dfb957dad9cf5e95fd63, указатель e3816d200454fa1b4b648c3cda0395eb109400df, удаление878c662e2cf81193edaf1337fee5ca902ce4e08d, сокращение1; пороги/HTTP-коды план, не успешный прогон.

Аккаунты: сведение881ace4582f6c6e76232983571b8171c5fe04eeb; README/deployment3d8015b5f3b4b1f234adad09d55f15c962c09d21; index/first_install213b2e7d7bd7209178096f285e7cd6e14adf2cf1; шесть событийcbf12e49294ae38e6c96f9b799ecb039286f14a8; служебная очистка94cfac4c44a7fd6c16e5273135ea869581deb09f, итог9fb849f149111c050d2f57ee35cd7667c71c3c4c. В двух руководствах создание/список/setup/management API/версии/rename/soft delete/два purge/guards/ошибки/проверки/задачи и profile/password/reset/MustChangePassword/криптография/лимиты/аудит/сессии. Различия валидации, CreateSlot, отсутствие автоматического MustChangePassword/каталога, своя текущая сессия против административного отзыва всех, неатомарность SQL/файлов сохранены. Git-источники881ace4582f6c6e76232983571b8171c5fe04eeb; первоначальный management878c662e2cf81193edaf1337fee5ca902ce4e08d, не main.

Удаления с полными diff/проверками HEAD: users.md effa498f1e1af93fd580b90decf4933fe1ac97d0; ui_and_users.md42ed0d7cf3cdd5cc317c1d905ac85d4f5387cb67; account_security.md6b2a7ac30ada5d6724e4234f67b91de10f5ff547; password_change.md9281f299bc640764b72275a135933e996b393b19. Каталог подтвердил отсутствие четырёх/наличие двух руководств и folders_and_purge. Сокращение4/новых0. Итог названных групп26, не изменение числа всех документов за ревизию. Backlog/handoff/ТЗ/реестр в текущем пакете не сокращают число файлов; удалений не имитировать пустым content.

## Исторические проверки октября

Перенесены из месячного файла на базе9fb849f; не новые прогоны. Дата исходника не дата недатированного наблюдения. До удаления реестра перенести существенное в существующее каноническое тестирование.

| Этап | Исторический охват / границы |
| --- | --- |
| 18a | 10 table_model/syntax, не full npm/build/CM/DOM/Firefox/IIS; позднее ручные ячейки/создание. List-inline-17b упомянут отдельно без назначенной даты. |
| 18b | 11 decoding/scope/catalog/syntax, picker вручную частично, source-дефект исправлен18c; full npm/build нет. |
| 18c | 12 source/caption/bounds/alignment/CRLF/syntax; 2 CM/parser подготовлены не запускались; позднее source links/alignment, не полный набор. |
| 18d | 10 изолированных/syntax6 модулей-тестов; 3 интеграционных не запускались; checkbox вручную, metadata видим до18e. |
| 18e | 12 metadata/removal/CRLF/stale-range/syntax; 2 renderer/minimal-DOM не запускались; позднее metadata/время/delete/Undo/Redo. |
| 18f | 14 модельных/syntax, 2 CM/parser не запускались; ручные hover/Alt-focus дефекты исправлены18g. |
| 18g | 5 hover-helper и 1 checkbox/6 host-кейсов/syntax; полный CM/исходный table_stamp_dom/wiring/native hover/drag/npm/build/Firefox/IIS не запускались, тест не исключён/assertions не ослаблены. Позднее ограниченная ручная проверка. |
| 18h | 10 модельных/syntax, 2 CM/parser не запускались. Файлы b7a728b3b1e58468b179b17c01d7647120a4b88f; одноимённый87b2b2eadcd508976f0f5f8570f75a7cadb50f88 в get_commit без изменений. TABLE-AXIS-DELETE-01 не закрыт коммитом. |
| 19a / 19b | 15 изолированных, позднее потеря конечного переноса/вторая строка; 8 assertions с parser/DOM stubs, copy/геометрия отдельно, первый клик не решён; нативное не возвращать к старой схеме. |
| 19c / 19d / 19e | 11 View-stub не браузер/маркер не исправление; 12 изолированных не DOM; 5 markerScope, старое ожидание изменено по спецификации. |
| 19f / 19g | 8 boundaries/eligibility; 10 вычитания ranges не Lezer/CM/все тематические слои. |
| 19h / 19i | 9 decoder-policy не реальные AST/CM/клик; 9 HR не доказательство причины геометрического наложения соседних строк. |
| 20a / model fix | 12 изолированных; скобкаe732dae. 327/327 — после runner до модели;339/339 — после скобки до20b, не текущий HEAD/20b–20f. |
| 20b | 9 helper/syntax;6 source_footnotes подготовлены не запускались без @codemirror/state, не повод менять зависимости. |
| 20c | 5 mapping/masking+4 inline-rule stubs/syntax;5 integration/DOM-smoke подготовлены, не full pipeline/test:all/build/Firefox/IIS. Reading появился, навигация без подсветки не полная готовность. |
| 20d | 11 sections/syntax, не реальный DOM/test:all/build/Firefox/IIS; отсутствие dynamic не кеш. Локальные даты20b–20d25 октября, UTC-коммиты24 октября. |
| 20e / 20f | В двухфайловый20e не вошли footnote_dynamic.test.mjs/docs/footnotes_dynamic_20e.md, не считать существующими/прошедшими.20f8 модельных/syntax не CM/DOM/геометрия/wrapped-bidi/Firefox/IIS/test:all/build, editor.js не менял; позднее ручная группа, не регрессия. |
| Runner | Node v20.20.1, Windows-специфичность не доказана; первый full52 файла/326 тестов/325pass/1fail без skipped/cancelled/todo. После фикса изолированная runner+test_all5pass/0fail, не WebVault. |
| Ранние UI | Создание свойств7 браузерных пунктов, toolbar5, padding/номера7, Undo свойств6 включая source; прокрутка временная проба/постоянный CSS; chips/links/autocomplete ограниченный охват. Fold11b исправлен без ослабления строгой проверки, с регрессиями. |
| Аккаунты / поздний Markdown | Недатированные домашние создание/запрет обычной роли/rename/два удаления ограничены, не полный npm/SQL/IIS.26a0007 план; новый runtime при переносе не запускался, точный ранний объём не установлен. Поздняя24 октября19e–19i,25 октября группы сносок — не весь Markdown. |

nativeText.extension восстановлен702aed18cbaf27640f38a86c5ca2248cbd7ea2ea; историческое побайтовое совпадение editor.js с резервной копией/синхронизация не bundle/full Node/build/браузер. В новом backlog временно сохранено уникальное свидетельство fold:23 базовых/41 из42 дополнительных до исправления, сборка остановлена; четыре добавленные регрессии не новые прошедшие тесты. Противоречие wiki_links «14 тестов/13 прошли» не разрешено догадкой. Остальные подробные свойства/календарь/DOM отчёты сохраняются в предметных источниках до сведения.

## Ссылки, ограничения и остаток

search_code incomplete_results=true не доказательство отсутствия ссылок. Полные git grep сносокb3c0fcf/e5dea981 и таблиц4c0b345/ca6dbfd использованы в пределах баз: index исправлен, после удалений текстовые имена реестра/исторического handoff, не относительные ссылки/якоря.

Аккаунты9281f299bc640764b72275a135933e996b393b19: первый вывод обрезан/повторён, компактный полный BEGIN/END/GREP_EXIT0/MATCH_RECORDS19, архив исключён. Исторические Git-ссылки/текстовые источники сохранены; рабочее project_overview:19 и deployment исправлены9fb849f; session_policy в handoff22 сохранён. Для next_steps/handoff перед переписыванием предоставлен полный адресный поиск якорей по4d80a0110eb3eb1d88ffbf65b14ae2fa9d33d5d0 вне архива: MATCH_RECORDS0/GREP_EXIT1 без ошибки. Новые handoff-ссылки сопоставлены с заголовками backlog. Это не общий аудит Markdown/якорей/секретов/полноты задач.

LINKS-FRAGMENTS-01 полностью сохранён в backlog: реальная текущая heading-цель, фильтр/клавиатура/подпись, исключение code/YAML/comments, source/dynamic/reading без reopen/потери Undo, родители/подсветка, неоднозначность не молча, затем file#heading/^block; wikiContext/# сверить по коду. Сохраняются MD-COMMENTS-01/native fallback/block boundaries, оба sidebar-пакета/resize/tools/drop, search options/suggest/history, tag chips→семантический поиск, bookmarks/ribbon, граф/глобальная схема/навигация/вкладки/split/темы/безопасность/бэкапы/все долгосрочные ТЗ.

Не закрыты: история после reload/reopen/native draft, YAML-типы/quoted ISO/глобальная схема, folding списков/таблиц/кода/цитат/прочих native folds, gutter не rendered folding, несколько черновиков, inline-задачи/UTC не закрываются wiki/property picker. Minimal не менеджер/opaque-eink, совместимость всех Obsidian-тем/плагинов не обещана; CHANGELOG-UI01/02/03 план. Не отменять требования из-за краткого handoff.

Далее предметно свести ссылки/списки, файлы/корзину/перенос, workspace/сохранение, свойства/схему, граф/индекс, темы/контракт/аудит, архитектуру/API/БД, тестирование, старые handoff, deployment/cm6_setup; продолжить трассировку уже прочитанных ТЗ/backlog по всем этим источникам, а не заново искать хвост. После переноса — исходные байты хеша архива, общий повторный аудит и удаление временного реестра.

Последний локальный снимок: fast-forward до849cbcd6c76d8a4b8c235151b463e9f48b54ddba, main/origin/main/origin/HEAD совпали, tracked/staged diff не показан, untracked src/WebVault.Web/assets/vendor/. Не вечный status/не получение будущего коммита, vendor не трогать.

Среда Windows7/.NET Framework4.5/классический ASP.NET/IIS/SQL Express2014/Firefox113, не Core. Node сборочного ПК, команды D:\project\WebVault\tools\cm6; npm test4 файла, test:all верхнеуровневые *.test.mjs не вложенные/браузер. Функциональная цепочка адресные→test:all→build после успеха→отдельная публикация→браузер, LASTEXITCODE/строгие assertions. Ассистент в документационной серии не запускал Node/build/PowerShell/SQL/IIS/браузер. Docs-only без обязательной сборки/публикации, со статической сверкой/полным diff. Код/SQL/зависимости/lock/bundle/данные/секреты/рабочий Web.config/node_modules не трогать; не reset --hard/clean/force push/автоматический stash. Отчёт: точный SHA/состав/удаления-добавления/проверки/остаток/безопасные команды получения. Проценты экспертные, не растут от синхронизации.
