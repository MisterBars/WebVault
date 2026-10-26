# Выбор заметки в свойствах

[Свойства](properties_panel.md) · [Wiki тела заметки](wiki_links.md) · [Таблицы](tables.md) · [Темы](theme_contract.md) · [Проверки](npm_build.md) · [Backlog](next_steps.md)

## Область и основания

Native wiki-picker text/list свойств и начального значения создания. Статическая база e29fbb44e5fe4b4a51dbf76f7cc3676d7b8dadc7: property_wiki_picker.js/property_link_model.js и интеграция properties_ui/property_add_ui. Provider editor.js сверялся в группе workspace. Это не новый Node/test:all/build/DOM/Firefox/IIS прогон и не проверка установленного bundle. CM completion тела, native picker и ячейки — разные контроллеры с общими моделями/каталогом.

## Поведение

[[ в text input/textarea или list-вводе открывает личный каталог. Числа/checkbox/date не получают этот picker. Модель propertyLinkChoices ищет слова в пути без регистра с ё→е, ранжирует точное имя/начало имени/начало пути/прочие совпадения, затем близость папки/путь; до30 вариантов. Имя/путь отдельными текстовыми строками. При открытии выбран первый вариант, в отличие от обычных value-подсказок без начального выбора.

ArrowUp/Down, Enter/Tab/мышь выбирают файл. В черновик вставляется root-qualified wiki с одной парой ]], выделяется существующая либо стандартная подпись. Выбор ещё не commit YAML. Prefix/suffix скалярного текста сохраняются, ввод после выбора меняет подпись, не путь. Подпись однострочная без ]]. После выбора Enter подтверждает поле; в textarea — внутри выбранной ссылки, вне неё обычные переносы сохраняются. Ctrl+S/штатный wvCommit поля остаются общим маршрутом подтверждения.

Для list полная wiki после commit показывается ссылкой с отдельным крестиком, остальные значения chips. Несколько wiki в text не превращаются в один anchor или новый тип Link. В создании выбор только заполняет text/list черновик, запись через Добавить; смена типа уничтожает контроллер и восстанавливает исходные атрибуты.

При wiki-вводе обычные value-подсказки отключаются. Меню fixed в body, не обрезается колонкой; textContent вместо HTML имён/путей. Blur/скрытие владельца/потеря фокуса и invalidation закрывают меню; disabled input не запускает refresh. Контроллер снимает только собственные aria-controls; destroy возвращает обработчик commit и исходные атрибуты.

## Защиты и совместимость

Provider использует wikiLinks.catalog и snapshot.isCurrent: проверяет пользователя/путь/режим/документ/readOnly/каталог. Epoch и подключённость input защищают async-выдачу; устаревший выбранный snapshot отклоняется и при подтверждении. Это не замена серверной авторизации. Каталог/пути/лимиты — [wiki_links.md](wiki_links.md#каталог-и-безопасность), не второй индекс или серверный ID.

Ctrl+Space в адресной части явно обновляет каталог. Подпись после | не новый поисковый адрес. Контекст не переходит физическую строку, учитывает escape/![[; # не допускается в запросе подсказки адреса. Наличие resolver fragment не готовый heading/block-picker: LINKS-FRAGMENTS-01 остаётся открытым.

Новая неполная wiki не коммитится: validatePropertyLinks требует ]] и непустой адрес. Неизменённое старое значение без нового review допускается без повторной валидации для legacy literal [[. Escape закрывает popup/pending, следующий отменяет изменённый wiki-черновик к начальному значению поля. IME не подтверждается преждевременно. Для буквального [[ использовать escape/source; plain metadata не объявляется полным Markdown-языком.

Commit меняет выбранное YAML-значение через propertyChange/CM/history/autosave, не сериализует соседей/тело. parseWholePropertyWiki требует одну полную wiki-строку, допускает одиночную ] в подписи, но не два отдельных wiki как один anchor. До смены других полей/режима завершить/отменить черновик: длительное хранение нескольких native-drafts не реализовано.

Inline-списки/checkbox/UTC уже имеют отдельный [контракт](list_inline.md); picker не реализует и не отменяет их. Табличный source escaping — [tables.md](tables.md), не автоматическое правило всех metadata-полей. Общая схема и сохранение drafts — [свойства](properties_panel.md) и backlog.

## Темы и статус

.wv-property-wiki-menu[role=listbox], .wv-property-wiki-option[aria-selected], .wv-property-wiki-name/path/help; style wv-property-wiki-style. Input — combobox, textarea сохраняет native textbox, aria-autocomplete/controls/activedescendant; footer — визуальная инструкция aria-hidden, не option. Палитра background-primary/modifier-border/active-hover/box-shadow, text-normal/muted, font-ui-small/smaller, --wv-ui-font/font-interface, radius-s/m. Нет внешних ресурсов; совместимость всех тем не гарантируется.

__WV_PROPERTY_LINKS_TEST='property-links-14' — метка исполняемой ветки, не релиз/тест/публикация. Реальные фокус/клавиатура/геометрия требуют браузера. Исторические11 модельных проверок и ограниченное ручное наблюдение23 октября сохранены в [документации проверок](npm_build.md#исторические-свидетельства-свойств), не являются регрессией текущего HEAD.

## План проверки и требования

На копии заметок: text/list/textarea/создание в dynamic/reading; слова имени/пути и однозначный выбор; prefix/suffix/одна пара ]]/выделение подписи; Enter/Tab/мышь/Escape/Ctrl+Space/IME; multiline вне ссылки; legacy literal/escape; invalid/new wiki; другой пользователь/документ/режим/каталог и detached/hidden input; независимость обычного value-popup; точечный YAML/Undo/autosave/save/reopen и календарь. Это план, не выполненный прогон.

Адресные property_link_model.test.mjs, связанные wiki/catalog/UI/history тесты выбирать по изменению; затем test:all → build после успеха → отдельная публикация → браузер по [npm_build.md](npm_build.md). Docs-only не требует build/новых зависимостей. LINKS-PROPERTIES-01 описан в объёме существующего picker; полная регрессия, PROPERTIES-DRAFTS-01 и LINKS-FRAGMENTS-01 остаются отдельным объёмом. История — [месячный changelog](changelog/2026-10.md#2026-10-23).
