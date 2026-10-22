# WebVault

Автономный сайт Markdown-заметок для IIS: классический ASP.NET/.NET Framework, C#, HTML/CSS/JavaScript и SQL Express 2014. Личные файлы хранятся вне сайта; ASP.NET Core не используется.

## Текущее состояние

- Аккаунты и личные хранилища, файловые операции, группы, корзина, автосохранение, импорт/экспорт .md и ZIP.
- CodeMirror 6: исходник, динамический режим и чтение; индекс ссылок и граф.
- Свойства редактируются в dynamic/reading: chips, ссылки, подсказки значений и имён, добавление полей, безопасные преобразования типов.
- Общая история заметки: Undo/Redo и верхняя панель с SVG-кнопками. Исправлены отступы/исходные номера блоков и общая прокрутка.

Состояние основано на пользовательской браузерной приёмке комплектов до `bcfe626` включительно. Это не отчёт о полной регрессии или совместимости со всеми возможностями/темами/плагинами Obsidian. История undo не переживает повторное открытие заметки/страницы; общая схема типов и тематический календарь остаются в плане.

## Документация

| Раздел | Где читать |
| --- | --- |
| Установка | [first_install](docs/first_install.md); дополнения [безопасность 06](docs/account_security.md), [папки/purge 07](docs/folders_and_purge.md) |
| Сборка и перенос JS | [npm_build](docs/npm_build.md) |
| Сессии и пароли | [session_policy](docs/session_policy.md) |
| Markdown и свойства | [live_preview_blocks](docs/live_preview_blocks.md), [properties_panel](docs/properties_panel.md) |
| Рабочая область и прокрутка | [workspace_layout](docs/workspace_layout.md), [note_scrolling](docs/note_scrolling.md) |
| Индекс/граф и перенос заметок | [note_graph](docs/note_graph.md), [note_transfer](docs/note_transfer.md) |
| Файлы и корзина | [trash_ui](docs/trash_ui.md), [multi_selection](docs/multi_selection.md) |
| Дизайн и адаптация тем | [Актуальный DOM/CSS-контракт](docs/theme_contract.md), [исторические уточнения](docs/theme_compatibility.md) |
| История изменений | [CHANGELOG](CHANGELOG.md) |
| Очередь задач | [next_steps](docs/next_steps.md) — требования, не обещание готовности |
| Все документы | [Указатель](docs/index.md) |

## Обновление и данные

Целевая среда: Windows 7, .NET Framework 4.5, Firefox 113, IIS и SQL Express 2014. Сборка JS выполняется на подходящем компьютере; Node/npm для запуска сайта не нужны. Публиковать `src/WebVault.Web`, не корень Git, tools, docs или node_modules. Изменения исходников CM требуют нового bundle; после переноса — сохранить заметки и Ctrl+F5.

SQL 00–07 находятся в database/install. Базовая установка описана до 05, дополнения 06/07 читаются отдельно; при обновлении применять только неприменённые скрипты после бэкапа БД/DataRoot. Не заменять рабочий Web.config шаблоном и не переносить чужие данные поверх своих.

Не коммитить настоящие заметки, DataRoot, вложения, бэкапы, секреты, рабочий Web.config или node_modules. Сохранять package-lock.json; проверенный bundle переносится отдельно или согласованным комплектом. История Git и внешние бэкапы не очищаются удалением заметки; установки не синхронизируются автоматически.

README содержит назначение, текущее состояние и навигацию. Подробности принятых изменений — в changelog, ограничения — в профильных инструкциях, требования — в next_steps. Прежний README сохранён полностью в [архиве](docs/changelog/archive/README_2026-10-22.txt).
