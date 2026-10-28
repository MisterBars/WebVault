# Свойства заметки

[Указатель](index.md) · [Wiki-picker](property_links.md) · [Сохранение](editor_autosave.md) · [Режимы](mode_slider.md) · [Индекс](note_graph.md) · [Темы](theme_contract.md) · [Проверки](npm_build.md) · [Backlog](next_steps.md)

## Назначение и статус

Контракт YAML-панели, добавления/преобразования/удаления, календаря и истории. Статическая база e29fbb44e5fe4b4a51dbf76f7cc3676d7b8dadc7: properties/properties_ui, модели и UI property_add/type/remove, property_values/suggestions, property_history/policy, calendar_model/ui и property_link_model/wiki_picker. Подключение editor.js сверялось в группе workspace. Это не новый test:all/build/публикация/IIS/браузерный прогон.

В dynamic/reading поддержанные свойства редактируются CM-транзакциями; тело reading остаётся read-only, source показывает YAML. Добавление, преобразование и удаление уже подключены. Глобальная схема, переименование полей и несколько сохраняемых native-черновиков не выводятся из этих функций.

## YAML, типы и лимиты

findFrontmatter распознаёт начальные --- с необязательным BOM и завершающую строку ---. Незавершённый блок не угадывается. inspectProperties использует yaml/core1.2, keepSourceTokens, intAsBigInt, resolveKnownTags:false. Ошибки/предупреждения, flow-карта верхнего уровня, сложные ключи и повтор имён без регистра требуют source.

- YAML-тело: до 16384 UTF-16 единиц, проверяется front.body.length, не размер UTF-8 байтов. Сообщение «16 KiB» не точная единица этой проверки.
- До 100 полей; изменённая заметка до 131072 UTF-16 единиц в клиентских моделях, серверные лимиты отдельно.
- Новое имя: Trim, 1–128 единиц, без U+0000–001F/U+007F; проверка дубликатов без регистра.

Типы: text, number, checkbox, date, локальный datetime без часового пояса, простой строковый list/tags. Date — YYYY-MM-DD, datetime — YYYY-MM-DDTHH:mm[:ss]; распознавание типа не универсальная валидация произвольного YAML. Null, сложные карты/последовательности, anchors/tags/aliases, небезопасные целые и неподдержанные значения не переписываются панелью. Для простого списка комментарии/сложные элементы также ограничивают редактируемость. Слишком большие bigint не округляются молча.

Тип определяется значением, не глобальной схемой: ISO-дата даже в кавычках может остаться date/datetime. Не обещать превращение её в text добавлением кавычек. Строка внутри простого списка остаётся строкой. cssclasses можно хранить, но применение оформления к заметке этим не реализовано.

## Значения, списки и подсказки

propertyChange меняет диапазон выбранного значения, сериализуя новое значение JSON-совместимым YAML, сохраняет его завершающий EOL и повторно разбирает результат. Остальные поля/тело не сериализуются; стиль/кавычки изменённого значения могут нормализоваться. No-op не создаёт изменения. UI вызывает onCommit, а не присваивает весь editor.value; guards интеграции проверяют пользователя/заметку/режим/expected doc/readOnly/busy.

Скаляр подтверждается change, Enter для однострочного поля или Ctrl+S через wvCommit. Многострочный text использует textarea. Список — единое chips-поле: Enter/Ctrl+S добавляют одно обрезанное значение без CR/LF; точный дубль не добавляется. Blur списка не коммитит черновик. Escape очищает ввод с учётом приоритета popup; IME Enter не подтверждает раньше времени. Крестик удаляет элемент, но при незавершённом вводе сначала требуется Enter/Ctrl+S или Escape.

Полная wiki-строка списка отображается ссылкой с крестиком, остальные значения chips. Крестик не открывает адрес; перед переходом ссылки непустой ввод этого списка пытается подтвердиться. Исходный YAML не меняется от отображения. Text/list и форма создания используют отдельный [native wiki-picker](property_links.md); скаляр с несколькими wiki остаётся текстом.

Value-подсказки подключены к list/tags, не ко всем скалярам. Источник — одноимённые без регистра свойства других личных заметок: текущая заметка и выбранные точные значения исключены. Подстрока без регистра, до20 вариантов; полное значение с wiki-подписью сохраняется, не одна подпись. Сбор в note_index без дополнительного прохода: до1000 простых строк на заметку, до1024 единиц в строке, без CR/LF/пустых значений. Унаследованы лимиты индекса300 заметок/20 MiB и остальные ограничения графа. Несохранённые правки другой вкладки не видны.

Меню по фокусу/вводу, начального выбранного пункта нет; стрелки выбирают, Enter/Tab с выбором подтверждают, Enter без выбора добавляет введённое. Escape закрывает меню, следующий очищает ввод. Popup fixed в body, закрывается при blur/удалении поля/invalidation; epoch/provider guards отбрасывают устаревшее. Ошибка индекса в title, ручной ввод остаётся. Wiki-popup и обычные варианты не открываются одновременно.

## Добавление поля

propertyAddChange/makePropertyAddition добавляют поле перед закрывающим YAML-разделителем. Без frontmatter создают его в начале после BOM с сохранением тела. Для синтетической панели dynamic используется нулевой widget без фиктивного номера/atomicRanges; в reading панель перед телом. Неполный YAML, дубликаты, лимиты и несоответствие повторно распознанного типа отклоняются.

Форма предлагает text/list/number/checkbox/date/datetime, известные имена и стандартные tags/aliases/cssclasses со значками. До30 подсказок, каталог до1000 имён; существующие имена исключены. Конфликт типов разных заметок не создаёт общую схему: форма предупреждает, начальный тип выбирается для текущей заметки. Стандартные поля должны быть list. При сбое индекса доступны стандартные имена/ручной ввод.

Пустой list создаётся как []; text может быть пустым, date/datetime требуют корректного начального значения, number — конечного числа безопасной точности. Picker/календарь заполняют черновик, запись только через Добавить. При смене типа начальное значение сбрасывается и контроллеры пересоздаются. Перед добавлением нужно подтвердить другой незавершённый списковый ввод; эту локальную проверку не объявлять общей защитой всех форм.

## Преобразование типа

Кнопка типа в dynamic/reading открывает JSON-предпросмотр Было/Станет. Только Применить пишет одну транзакцию текущего поля; Escape/Отмена не меняют документ. Открытая форма добавления и незавершённые значения блокируют операцию. Сложные/readOnly поля недоступны. propertyTypePreview повторно проверяет YAML, значение и итоговый тип, не назначает тип другим заметкам.

Допустимы канонический числовой text ↔ безопасное конечное number; true/false → checkbox; числовые0/1 ↔ checkbox; скаляр → одноэлементный строковый list, один элемент → подходящий скаляр, пустой list → пустой text. Multiline не превращается в простой list. Несколько элементов не объединяются/не отбрасываются. Пробелы,001,2.0,1e3 и потеря точности не исправляются автоматически ради number.

Date → datetime явно добавляет00:00; datetime → date допустим только с нулевым временем. Ненулевое время не отбрасывается, часовой пояс не преобразуется. Tags/aliases/cssclasses остаются list. Если parser распознаёт ISO-строку как дату, запрошенный text отклоняется. Запретное преобразование имеет причину и disabled Применить. Undo восстанавливает записанное состояние, не выполняет обратное преобразование в обход защиты времени.

## Удаление целого поля

propertyRemoveChange/makePropertyRemoval и attachPropertyRemoval подключены из properties.js. Крестик у имени — поле целиком, не отдельный chip. Локальный dialog показывает имя, начальный фокус Отмена; Escape/Отмена ничего не записывают. При подтверждении повторно проверяются черновики всех полей, форма добавления/другие диалоги, подключённость root и onCommit guards. Используется .wv-property-type-panel.wv-property-remove-panel, поэтому history policy распознаёт незавершённый диалог.

Удаляется точный диапазон ключа/значения без сериализации соседей. Отдельные соседние комментарии сохраняются, комментарий строки удаляемого поля удаляется с ней. Повторный parse проверяет порядок/ключи/типы/значения/raw остальных полей. Последнее поле оставляет пустой frontmatter с доступным добавлением. Сложные/readonly/anchored/tagged значения и неоднозначные ключи требуют source. Одна операция общей истории/autosave, не изменение схемы всего vault.

## Календарь

Собственный DOM-календарь date/datetime подключён в dynamic/reading и создании. ISO-ввод текстовый, не системный date/time popup. Локальные SVG, месяц/год, неделя с понедельника, Сегодня/Сейчас, часы/минуты/секунды, Применить/Отмена. Смена вида месяца/стрелки сетки не записывает дату. Сегодня меняет только дату, Сейчас явно выбирает локальные дату/время. Смена даты сохраняет ненулевое время и точность секунд; UTC-сдвига дня нет.

Arrow/Home/End, PageUp/Down и Shift+PageUp/Down; Alt+ArrowDown открывает из поля. Escape закрывает без записи, следующий Escape существующего неподтверждённого поля возвращает исходное значение. Popup fixed в body, позиционируется в viewport, закрывается при потере/скрытии владельца, смене режима/заметки, клике вне и уходе владельца за вертикальный viewport. Tab циклически обходит popup. Применить существующего поля использует wvCommit/history, формы создания — только черновик. Ошибка commit восстанавливает предыдущее значение поля; невозможные даты/время отклоняются. Календарь не меняет правила преобразования/сервер.

## Общая история и черновики

commitPropertyChange использует input.properties и isolateHistory.of('full'). Время и преобразование отменяются раздельно; Undo относится ко всей заметке, не одному полю. Ctrl/Cmd+Z, Shift+Z и Y работают в области заметки, не поверх поиска/паролей/настроек/dialog. Незавершённые native-input сохраняют native Undo; формы/диалоги/табличный draft блокируют документальную историю.

Верхние SVG Undo/Redo в #notesPane .view-actions доступны во всех режимах, дубли YAML убраны; disabled/title объясняют глубину/причину. До 760px подписи скрыты с сохранением SVG/aria-label. Guards owner/user/path/hasVault/forced change/readOnly/disabled/busy/state.readOnly не обходятся. Старый callback другой заметки не пишет. После операции фокус восстанавливается по актуальному полю, иначе reading/CM.

WebVaultHistory.status() возвращает mode/undoDepth/redoDepth/writable/blockedByDraft/canUndo/canRedo без текста заметки; undo()/redo() используют те же защиты. При диагностике сравнивать status до/после операции/режима. Reopen/reload создаёт новый EditorState, прежняя история не восстанавливается из сервера/Git. До смены поля/режима подтвердить Enter/Ctrl+S или отменить черновик: множественное долгоживущее хранение форм не реализовано.

## DOM/CSS и диагностика

База .wv-properties.wv-properties-v2, .wv-property-row:hover/:focus-within, .wv-property-name-cell/name/value/error, .wv-property-list-field/input, .wv-property-chip/text/remove, .wv-property-link-item и a.wv-property-note-link. Data-wv-property — имя, не стабильный ID; случайные input id не селекторы темы. Подсказки .wv-property-suggestions/.wv-property-suggestion[aria-selected], style wv-property-suggestions-style.

Добавление: .wv-property-add-button/form/status/actions/value, .wv-property-name-picker/menu/option, .wv-property-type-icon; style wv-property-add-style. Преобразование: button.wv-property-type-button[aria-expanded], .wv-property-type-panel/before/after/message/actions; style wv-property-type-style. Удаление: .wv-property-remove-button[aria-expanded], .wv-property-remove-panel[role=dialog], style wv-property-remove-style.

История: .wv-property-header, .wv-note-history-actions/button/icon/label и data-wv-history; прежние .wv-property-history-actions/button сохранены для совместимости, style wv-note-history-style заменяет wv-property-history-style после reload. Календарь: .wv-date-field/input/trigger, .wv-calendar/header/jump/grid/week/weekday/day/time/preview/message/actions/apply, aria-selected/current, is-today/outside-month; style wv-calendar-style. Базовые style wv-properties-style и wv-properties-v2-style сохранены. Wiki-DOM — [property_links.md](property_links.md).

Цвета/границы/hover/фокус через background-primary/secondary/modifier-form-field/border/hover/box-shadow, text-normal/muted/faint/error/accent, interactive-accent/normal/hover и radius/input/font токены. --wv-calendar-background имеет fallback, тень — rgba; полный DOM/токен-контракт — [theme_contract.md](theme_contract.md). SVG локальны/currentColor, пользовательские имена/значения через textContent, без CDN/исполнения HTML. Это не менеджер/автоматическая совместимость всех тем.

Маркеры: __WV_PROPERTIES_TEST='properties-undo-06', __WV_HISTORY_UI_TEST='history-toolbar-07', __WV_CALENDAR_TEST='calendar-09', __WV_PROPERTY_REMOVE_TEST='properties-remove-16'. Это диагностические ветки, не релиз/результат теста/доказательство публикации bundle.

## Проверки и требования

План на копии заметок: все типы/списки/мультитекст и ошибочный/сложный YAML; добавление с/без BOM/frontmatter, дубликаты/лимиты/опасные числа; подсказки и IME/Escape/Enter/Tab/смена пользователя; преобразования/запрет потери времени/точности; Cancel/Undo/Redo удаления вплоть до последнего поля; календарь/секунды/локальные даты/геометрия; раздельная история времени/типа, native draft и guard старого документа; source/reading/dirty/autosave/save/reopen без изменения соседнего YAML/тела. Индекс недоступен — ручной ввод работает. Wiki-picker/таблицы/folding/gutter/ссылки не регрессируют.

Адресные файлы выбирать по изменению: properties/properties_ui, property_values, property_add_model/property_add_yaml, property_type_model/property_type_yaml, property_remove_range/property_remove_yaml, property_history/property_history_policy, note_history_controls, calendar_model и property_link_model *.test.mjs. Затем test:all → build после успеха → отдельная публикация → браузер по [npm_build.md](npm_build.md). Наличие тестов не запуск; зависимости/lock не обновлять только из-за старой инструкции npm install. YAML/commands уже являются сборочными зависимостями. Docs-only не требует build.

Сохраняются PROPERTIES-UI-01–06, PROPERTIES-UNDO-01, PROPERTIES-DRAFTS-01, HISTORY-UI-01 и LINKS-PROPERTIES-01 с точными остатками [backlog](next_steps.md#свойства-и-история). Глобальная схема/YAML-типы, rename, применение cssclasses и восстановление нескольких drafts не закрыты. Корзина/счётчик описаны в [file_vault.md](file_vault.md#кнопка-корзины-и-счётчик), не второй контракт здесь; отсутствие поля/функции в раннем комплекте не текущий отрицательный статус.

Исторические события — [месячный changelog](changelog/2026-10.md); детальные исходные проверки/частичная приёмка — [свидетельства свойств](npm_build.md#исторические-свидетельства-свойств). Первая панель/нижняя корзина и событие удаления уже записаны в месяц коммитом83c458db15e6541fceab273076f812c882825cd8; повторный перенос не требуется. Дубль property_removal.md удалён4b2d3b9343fcb38d1f5064143b39b5967ac8496e после сведения контракта и свидетельств; закреплённый исторический Git-источник сохранён в npm_build.md. Сведённый theme_compatibility.md удалён коммитом 031e30f86a8cab35e23e0961265efd517def125a; сохранённое содержание и историческая версия указаны в [границе сведения рабочей области](workspace_layout.md#граница-сведения). Архивный README/checksum остаётся до собственной содержательной и побайтовой сверки. Общая ревизия и функциональная регрессия этим не закрыты.
