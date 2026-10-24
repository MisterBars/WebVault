# Удаление строк/столбцов — кандидат 18h, 24.10.2026

Дополняет table_structure_18f.md, table_hover_host_18g.md и next_steps.md; старые требования не переписываются. Пользователь принял 18g сообщением «всё чётко», предложил маркеры удаления. Полные npm-логи не предоставлены.

В dynamic рядом с ⋮⋮ появились отдельные ×: слева у строки данных, сверху у столбца. Те же hover-поля, но для двух кнопок слева резерв 44px, min-width ячейки 70px предотвращает наложение ×/⋮⋮/⋯. × не draggable, его события не включают редактор ячейки. Подтверждение — прежний тематический modal dialog, начальный фокус на Отмена, Escape/Отмена не удаляют данные.

Строка удаляется со всем содержимым; столбец — со своим заголовком/alignment/ячейками/UTC. Остальные значения проверяются после parse, ссылки и timestamps не пересчитываются. Заголовок не является удаляемой строкой данных. Последнюю строку данных удалить можно, остаётся header+delimiter и ＋; последний столбец нельзя (disabled ×, использовать «Удалить таблицу»). При одном оставшемся столбце форматтер добавляет внешние pipe, иначе Markdown parser может перестать видеть таблицу.

Сохраняются guards canWrite/canStart/expected doc/source и finishDraft. Если commit ячейки изменил doc, пользователь повторяет удаление на актуальном DOM. Применение подтверждения снова проверяет контекст. Одна input.table.structure/isolateHistory транзакция, один Undo/Redo, прежний autosave; фокус соседней ячейки без открытия textarea. Чужие текст/YAML/таблицы и пустой хвост не нормализуются. Reading/source без новых destructive controls; перенос/добавление/выравнивание/удаление всей таблицы сохраняются.

Контракт: .wv-table-axis-delete, .wv-table-axis-delete-button[data-wv-table-controls], style wv-table-axis-delete-style; прежний dialog и tokens. window.__WV_TABLE_AXIS_DELETE_TEST='table-axis-delete-18h' после рендера таблицы. Зависимости/SQL/Web.config не меняются.

10 изолированных тестов модели прошли у ассистента, syntax model/new UI/tests проверен Node. 2 CM+parser теста подготовлены, не запускались; изменённое подключение alignment, full npm test/build и browser/DOM/Firefox/IIS не запускались. TABLE-AXIS-DELETE-01 — кандидат до приёмки.

После pull из tools/cm6: npm test; node --test table_axis_delete_model.test.mjs table_axis_delete.test.mjs table_structure.test.mjs table_hover.test.mjs table_stamp_dom.test.mjs; затем npm run build при успехе, bundle и Ctrl+F5.

Проверить на копии матрицы: hover-поля и независимость ×/⋮⋮/⋯; удаление первой/последней строки и столбца с Отмена/Escape; Undo/Redo возвращают значения/ссылки/UTC/alignment; одна колонка и ноль строк данных остаются таблицей; ＋/drag/клавиатура/сохранение/повторное открытие не регрессируют. Незавершённый ввод/readonly/busy не обходятся.
