# Hover ручек и headless checkbox — кандидат 18g, 24.10.2026

Дополняет table_structure_18f.md и next_steps.md. Старые задачи сохранены. Пользователь положительно оценил 18f, но сообщил исчезновение controls при подходе мышью и непонятность Alt+стрелок; полная приёмка hover не заявляется.

Ошибка table_stamp_dom.test.mjs воспроизводится до проверок metadata: при отсутствии window выражение typeof window !== undefined && window.WebVaultCore давало false, а core?.state.user пыталось читать user у undefined. В task_ui добавлен nullable host и optional guards всей цепочки. Без полного контекста user/note/doc checkbox создаётся disabled и не пишет данные. Реальные guards owner/doc/history/readonly/mode сохранены. Исходный table_stamp_dom.test.mjs не исключён и его assertions не ослаблены; task_ui_host.test.mjs добавляет шесть отсутствующих/частичных контекстов и проверяет отсутствие записей.

Hover: ручка теперь внутри прозрачного hitbox. Слева — полоса 22px на всю высоту строки, сверху — 22px на всю ширину заголовка. Зоны непрерывно соединяют ячейку и controls, удерживая hover строки/заголовка. Выравнивание поднято z-index над верхней зоной, чтобы она не перекрывала кнопку/меню. Клик пустого поля не редактирует ячейку; default mousedown ручки не отменяется для native drag. По клику ручка получает фокус, показана focus-visible рамка, aria-keyshortcuts описывает клавиши.

Alt+стрелки работают только на сфокусированной ⋮⋮: нажать ручку либо Tab к ней, затем Alt+↑/↓ для строки данных или Alt+←/→ для столбца. Это перенос на одну позицию с тем же Undo. В textarea ячейки этот shortcut не включается. Модель данных/UTC/строк/столбцов не меняется.

Контракт: .wv-table-row-hitbox/.wv-table-column-hitbox[data-wv-table-controls], style wv-table-hover-style; прежние tokens/focus accent. Маркер window.__WV_TABLE_HOVER_TEST='table-hover-18g' после рендера таблицы, marker структуры остаётся table-structure-18f. Нет зависимостей/SQL/Web.config изменений.

Проверки ассистента: 5 тестов нового hover-helper с DOM-заглушкой прошли; изолированная фабрика checkbox из изменённого task_ui прошла 1 тест с 6 host-кейсами без исключений/записей. Syntax task_ui/hover-helper/new tests проверен Node. Полный импорт CM, исходный table_stamp_dom, wiring table_structure_ui, npm test/build и настоящий hover/drag/Firefox/IIS здесь не запускались. Не заявлять весь набор зелёным до запуска у пользователя.

После pull из tools/cm6: npm test; node --test table_stamp_dom.test.mjs task_ui_host.test.mjs table_hover.test.mjs table_task.test.mjs table_structure.test.mjs; затем npm run build только после успеха, обновить bundle и Ctrl+F5.

Чек-лист: исходный падавший тест зелёный без исключения; медленно вести мышь из ячейки в левую/верхнюю полосу и к ручке/⋯, controls не исчезают; пустое поле не открывает textarea; клик ⋮⋮ показывает фокус, Alt+стрелка переносит нужный элемент; native drag, Undo/Redo, picker, checkbox/time и выравнивание без регрессий. Особенно проверить высокие строки, узкие колонки и прокрутку. Остальные задачи/ограничения 18f сохраняются.
