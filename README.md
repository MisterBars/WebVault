# WebVault

Автономный Markdown-сайт для IIS: классический ASP.NET/.NET Framework, C#, HTML/CSS/JavaScript, SQL Express2014. Личные файлы вне сайта. ASP.NET Core не используется.

## Состояние
Реализованы аккаунты/хранилища, файловые операции, корзина, группы/drag, autosave, CM6 с тремя режимами, перенос .md/ZIP, первый индекс и граф в рабочей области. Основные сценарии, перенос и граф подтверждены пользователем; полная совместимость с Obsidian не заявлена.

Новый этап: [панель свойств](docs/properties_panel.md) — типизированные значения existing YAML в dynamic, read-only в чтении, source YAML в исходнике; обычные Save/Reload скрыты в CM, корзина красной иконкой снизу с обновляемым счётчиком. Исходники требуют install/test/build и браузерной проверки. Это не реализация флажков задач, редактируемых таблиц и всех остальных пожеланий. Граф признан достаточным сейчас, дальнейшее сходство/настройки оригинала внесены в [план](docs/next_steps.md).

## Навигация
| Задача | Инструкция / пометка |
| --- | --- |
| Установка | [first_install](docs/first_install.md) — IIS/SQL/DataRoot/администратор; база SQL до05 |
| Дополнения | [Безопасность06](docs/account_security.md), [папки/purge07](docs/folders_and_purge.md) |
| Сессии/пароли | [session_policy](docs/session_policy.md) — приоритет над старыми правилами выхода |
| Собрать браузерный JS | [npm_build](docs/npm_build.md) — дома, lock/test/build и перенос bundle |
| Свойства и корзина | [properties_panel](docs/properties_panel.md) — новый этап, ограничения/проверки |
| Рабочая область/настройки | [workspace_layout](docs/workspace_layout.md) — граф/ribbon, Общее и перенос |
| Индекс/граф | [note_graph](docs/note_graph.md) — resolver, лимиты |
| Импорт/экспорт | [note_transfer](docs/note_transfer.md) — .md/ZIP, размещение кнопок уточнено в workspace_layout |
| Markdown | [live_preview_blocks](docs/live_preview_blocks.md) — блоки/ограничения; свойства обновлены отдельно |
| Файлы | [trash_ui](docs/trash_ui.md), [multi_selection](docs/multi_selection.md) — операции/группы; расположение корзины обновлено |
| Все документы | [Указатель](docs/index.md) |
| План | [next_steps](docs/next_steps.md) — не готовые функции |

## Обновление и данные
Публиковать src/WebVault.Web, не tools/docs/корень Git/node_modules. Изменения tools/cm6/зависимостей требуют новой сборки. Исходники не означают готовый bundle; после обновления сохранить заметки и Ctrl+F5. npm test/build не заменяют браузерный тест. Node/npm на рабочем ПК для запуска не нужны.

SQL00–07 в database/install; базовая инструкция до05, дополнения06/07 читать отдельно. На обновлении только неприменённые после бэкапа БД/DataRoot. Новый комплект SQL/Web.config не меняет. Цель Windows7/.NET Framework4.5/Firefox113, IIS/SQL Express2014 на одной машине, автономная работа; сборка дома.

Не коммитить реальные заметки/DataRoot/вложения/бэкапы, пароли/рабочий Web.config. node_modules игнорируется; lock сохранять с package.json; проверенный bundle можно переносить Git. История/внешние бэкапы не очищаются удалением заметки; установки не синхронизируются автоматически. Каждый комплект обновляет документацию, различая реализацию/проверку/план.
