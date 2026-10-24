# Структура таблиц — кандидат table-structure-18f, 24.10.2026

Дополняет tables.md/next_steps.md, старые задачи сохранены. Пользователь явно принял 18e: metadata скрыта, время видно, удаление/Undo/Redo работают. Вывод npm test/build не предоставлен.

В dynamic ＋ снизу добавляет пустую строку, ＋ справа — пустой столбец с заголовком и --- alignment. Открывается первая новая ячейка. Ручки ⋮⋮ слева от строк данных и над столбцами видны при hover/focus. Drag показывает границу вставки; запись только при drop. Перенос со сдвигом, заголовок в тело не переносится; столбец несёт заголовок/alignment/все значения, строка — все ячейки. UTC и escaped wiki не пересчитываются.

Tab к ручке, Alt+↑/↓ — строка, Alt+←/→ — столбец; фокус остаётся на ручке после клавиатуры. После drag фокус на ячейке, после добавления — редактор новой ячейки. Своя позиция/no-op и отмена drag не пишут документ. Перенос между таблицами не принимается, DataTransfer не содержит содержимого.

Перед операцией finishDraft; если он изменил doc — повтор на актуальном DOM. Guards canWrite/canStart и snapshot сохраняются. Каждый add/move — одна input.table.structure/isolateHistory транзакция, Undo/Redo и прежний autosave. Модель сохраняет соседний текст, хвостовые пустые строки, EOL в позициях строк и raw-сегменты ячеек. Для пустой крайней ячейки при необходимости добавляется внешний pipe. Повторный parse проверяет все значения/alignment. Лимиты: 200 строк данных, 50 столбцов, 131072 символа заметки. Ragged-таблицы не получают обхода защиты. Reading/source без новых controls; delete/выравнивание сохранены.

Контракт: .wv-table-structure-frame, .wv-table-row-handle/.wv-table-column-handle[data-wv-structure-axis/index], .wv-table-add-row/.wv-table-add-column, .wv-table-drop-before/after-row/column; style wv-table-structure-style, прежние токены темы. Маркер window.__WV_TABLE_STRUCTURE_TEST='table-structure-18f' после рендера таблицы. Новых зависимостей/SQL/Web.config нет.

14 изолированных тестов модели прошли локально у ассистента, syntax model/UI проверен Node. Два CM/parser теста в table_structure.test.mjs подготовлены, не запускались. Full npm test/build, DOM/native DnD/Firefox/IIS не запускались. TABLE-STRUCTURE-01/02 — кандидаты, не приёмка.

После pull из tools/cm6: npm test; node --test table_structure.test.mjs table_model.test.mjs table_task.test.mjs table_source_align.test.mjs table_stamp_dom.test.mjs; затем npm run build после успеха, bundle и Ctrl+F5.

Проверить: ＋ снизу/справа и фокус; перенос первой/последней строки и столбца с alignment/ссылками/датами; Alt+стрелки, границы drop, отмену/no-op; Undo/Redo и save/reopen; черновики/readonly/busy; узкую панель, scroll/hover/Tab; сохранность delete/picker/checkbox. Удаление отдельных строк/столбцов и вставка в произвольное место остаются отдельными задачами.
