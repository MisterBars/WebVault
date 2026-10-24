# Указатель документации WebVault

[README](../README.md). Старые этапы — исторический контекст, последующие уточнения имеют приоритет.

## Установка/сборка
- [first_install.md](first_install.md) — IIS/SQL/DataRoot/администратор; база до05.
- [npm_build.md](npm_build.md) — зависимости/lock/test/build, перенос JS/ошибки.
- [cm6_setup.md](cm6_setup.md) — первый CM, позже расширен.
- [deployment.md](deployment.md) — отдельные старые страницы устарели.
- [TEST_CHECKLIST.md](TEST_CHECKLIST.md) — базовые проверки, дополнять.
- [SQL](../database/install) — 00–07, при обновлении тольконеприменённые после бэкапа.

## Аккаунты
- [account_security.md](account_security.md) — безопасность/06.
- [session_policy.md](session_policy.md) — приоритетная политика сессий/временного пароля.
- [password_change.md](password_change.md) — этап смены пароля.
- [users.md](users.md) — ранние аккаунты.
- [user_management.md](user_management.md) — управление, дополнено folders_and_purge.
- [ui_and_users.md](ui_and_users.md) — ранний UI.

## Рабочая область/Markdown
- [properties_panel.md](properties_panel.md) — НОВОЕ: существующие YAML-поля, Save/Reload в CM, корзина внизу со счётчиком; сборка/проверки.
- [workspace_layout.md](workspace_layout.md) — граф в main/ribbon, Общее/Аккаунт и перенос.
- [note_graph.md](note_graph.md) — индекс/resolver/лимиты; UI обновлён в workspace_layout.
- [live_preview_blocks.md](live_preview_blocks.md) — dynamic/read блоки; свойства позже заменены панелью.
- [editor_autosave.md](editor_autosave.md) — autosave/ранний просмотр.
- [mode_slider.md](mode_slider.md) — переключатель, старый мост чтения заменён.
- [unified_window.md](unified_window.md) — index.html/модальные вход и настройки.
- [theme_compatibility.md](theme_compatibility.md) — темы.

## Файлы
- [note_transfer.md](note_transfer.md) — .md/ZIP; размещение в workspace_layout.
- [file_vault.md](file_vault.md) — этап хранилища.
- [folders_and_purge.md](folders_and_purge.md) — папки/удаление владельца07, не корзина заметок.
- [trash_ui.md](trash_ui.md) — серверные операции корзины.
- [multi_selection.md](multi_selection.md) — группы/drag; новый ribbon-счётчик в properties_panel.

## Архитектура/план
- [API_OVERVIEW.md](API_OVERVIEW.md) — API этапа, новые возможности сверять с кодом.
- [db_schema.md](db_schema.md) — схема, сверять SQL.
- [application_design.md](application_design.md) — проектирование.
- [project_overview.md](project_overview.md) — ранний снимок, текущее в README.
- [ТЗ001](specifications/001-webvault-v0.1.md), [ТЗ002](specifications/002-editor-files-and-accounts.md) — требования.
- [next_steps.md](next_steps.md) — актуализированные следующие задачи, включая дальнейшие настройки графа по образцу Obsidian.

Новые документы добавлять с назначением; старую политику/размещение явно связывать с заменяющей инструкцией.


## Дополнение 22.10.2026: история и актуальный контракт оформления
- [CHANGELOG](../CHANGELOG.md) — пользовательская история принятых изменений, отдельно от README/задач.
- [Правила changelog](changelog/README.md), [октябрь 2026](changelog/2026-10.md), [архив прежнего README](changelog/archive/README_2026-10-22.txt).
- [theme_contract.md](theme_contract.md) — актуальная карта реальных DOM/CSS/токенов; исторические уточнения theme_compatibility.md сохранены.
README теперь краткое текущее состояние и навигация. Подробный дневник патчей в него больше не добавлять. Старые задачи/инструкции этим разделением не удаляются.


## Дополнение 22.10.2026: исходная нумерация
- [editor_gutters.md](editor_gutters.md) — положение gutter у левого края, реальный DOM/CSS-контракт, измерения и ограничения; не folding в reading.


## Дополнение 22.10.2026: разделы заголовков
- [heading_folding.md](heading_folding.md) — сворачивание разделов dynamic/reading/source, исключение YAML из source fold, view-only состояние и ограничения первого этапа.


## Дополнение 22.10.2026: текст и совместимость тем
- [note_appearance.md](note_appearance.md) — CM/DOM selection, синтаксис и шрифтовые роли, диагностика/проверки.
- [theme_adapter.md](theme_adapter.md) — реализованная основа и границы будущего адаптера.
- [Minimal 8.1.7](themes/minimal-8.1.7.md), [машинный аудит](themes/minimal-8.1.7.audit.json) — разбор пользовательского CSS, не установленная тема.


## Дополнение 23.10.2026: wiki-ссылки
- [wiki_links.md](wiki_links.md) — [[ menu, однозначный путь, подпись и клик; границы первого этапа и следующий inline-список/checkbox.


## Дополнение 23.10.2026: ссылки свойств
- [property_links.md](property_links.md) — native text/list picker, подпись, shared catalog, Enter/readonly/состояния и ограничения.

## Дополнение 24.10.2026: актуальное продолжение и проверка 01
- [handoff_2026-10-24_late.md](handoff_2026-10-24_late.md) — текущая передача после принятого 19i, ограничения и полный запуск npm run test:all; сначала читать в следующей беседе.
- [handoff_2026-10-24.md](handoff_2026-10-24.md) — оба пакета требований Markdown/боковой панели и историческая исходная точка; [handoff_2026-10-22.md](handoff_2026-10-22.md) — более ранняя передача.
- [markdown_text_19a.md](markdown_text_19a.md), [paragraph_lines_19b.md](paragraph_lines_19b.md), [widget_click_19c.md](widget_click_19c.md) — история кандидатов BR/строк/первого клика; 19c не считать принятым решением.
- [native_text_19d.md](native_text_19d.md), [native_reveal_19e.md](native_reveal_19e.md), [native_headings_19f.md](native_headings_19f.md) — нативные текст/код/обычные заголовки, раскрытие активной разметки и folding; поздние уточнения имеют приоритет.
- [source_mark_19g.md](source_mark_19g.md), [native_literals_19h.md](native_literals_19h.md), [hr_gutter_19i.md](hr_gutter_19i.md) — source mark, escape/entities и номер отрисованного разделителя.
- Табличные этапы: [tables.md](tables.md), [18b](table_links_18b.md), [18c](table_source_align_18c.md), [18d](table_tasks_18d.md), [18e](table_stamp_delete_18e.md), [18f](table_structure_18f.md), [18g](table_hover_host_18g.md), [18h](table_axis_delete_18h.md). Статус конкретного этапа сверять с поздней приёмкой, не по наличию файла.
Общий next_steps не заменён старым вложением: его репозиторный хвост ещё не прочитан целиком. Новая передача фиксирует локальную очередь текущей беседы, а не полную актуализацию всего backlog. Старый текст указателя сохранён.

## Уточнение 24.10.2026: первый полный прогон и идентичность next_steps
- [test_all_19j_fix.md](test_all_19j_fix.md) — результат 326/325/1, воспроизведённая причина вложенного runner, усиленная проверка и исправление сведений о next_steps. Читать вместе с поздней передачей; это уточнение имеет приоритет над прежними ошибочными выводами.
Утверждение выше и в прежних handoff о «старом вложении/неполученном репозиторном хвосте» отозвано: после CRLF→LF Git blob SHA вложения точно совпал с актуальным docs/next_steps.md в main (f3206da52316fb3674f08b7f2d034e1b23431840). Документ действительно заканчивается property-links-14, отстаёт сам backlog, а не предоставленный пользователем файл. Повторно просить вложение не нужно. Сам next_steps пока не изменён, последующая актуализация только дополняет его.
