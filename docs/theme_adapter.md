# Адаптация тем Obsidian к WebVault

[DOM/CSS-контракт](theme_contract.md) · [Роли и выделение](note_appearance.md) · [Аудит Minimal8.1.7](themes/minimal-8.1.7.md) · [Машинные данные](themes/minimal-8.1.7.audit.json) · [Backlog](next_steps.md)

## Область и реализованная основа

База документальной сверки —2dd2a83c9b7d462727027cf92fc07fe2500e5ccd: note_theme.js/note_theme_contract.js, obsidian-tokens.css, renderer/package.json и тематические руководства/машинный аудит. Это статическая сверка, не новый запуск AST-аудита исходного CSS, Node/build/публикация или Firefox/IIS-проверка.

Уже существуют собственные семантические роли WebVault для UI/note/editor/code/font-size/selection/маркеров/активной строки и стабильные wv-md-*/wv-syntax-* классы. Defaults — в раннем obsidian-tokens.css; явный non-fallback tagHighlighter не светлый defaultHighlightStyle. CM selection-layer и native input/textarea имеют разные правила; native прозрачность строк CM сохраняется. Body class/style и завершение локальных шрифтов запрашивают measure без изменения текста. Полный контракт/preview/ограничения — [note_appearance.md](note_appearance.md), не копия всей темы здесь.

Это основа сопоставления ролей, не работающий loader произвольных тем. WebVaultAppearance.status() явно сообщает themeAdapterActivated:false/rawThemeAppliedByThisKit:false. Временный preview не сохраняемый личный выбор темы. Знакомые DOM/CSS-имена и визуальное сходство не Obsidian API/совместимость плагинов.

## Что не реализовано этой основой

Загрузка theme.css, менеджер тем/личный выбор, исполнение Style Settings/Minimal Theme Settings/Hider, compiler всех селекторов, автоматическая загрузка шрифтов, все цветовые варианты/opaque-eink/foreground вторичных выделений. Автозагрузка из .obsidian/themes или исполнение .obsidian/стороннего JS не выводятся из каталога CSS-переменных. Будущие предпочтения хранятся для каждой учётки отдельно, не одним глобальным переключателем сервера.

## Проект безопасного адаптера

1. Получить manifest/версию/лицензию и разобрать CSS через AST. Собрать custom properties, зависимости var(), условия/media, ресурсы и необходимые browser features. Не подменять конкретный переданный снимок «последней версией GitHub».
2. Переносить поддержанные значения через явную карту ролей. Тип переменной не угадывать по слову font: --font-code у Minimal — размер, не семейство. Проверять вычислимость цепочек var() и наличие локальных шрифтов, не обещать недоступный fallback.
3. Применять только проверенные mapping rules к реальному DOM: текст/маркеры, headings, ссылки, свойства/календарь и поддержанные состояния hover/focus/disabled/ошибок. Не добавлять фиктивные cm-s-obsidian/HyperMD/mod-cm6 классы ради активации чужого layout и не выполнять глобальную regexp-замену селекторов.
4. Отделить палитру/типографику от компоновки. Gutter/sizer/scroll/folding, native desktop/Electron и plugin-specific поведение не переносить автоматически; проверить порядок внешних stylesheet и поздних JS-style, !important/специфичность. Тема не исправляет guards/историю/native drafts.
5. Определить профиль Firefox113, theme-dark/light и supported states. :has() требует явной адаптации к классам/правилам состояния целевой среды; конкретные color-mix выражения проверять через CSS.supports. Оpaque/e-ink требует отдельного foreground/secondary-selection решения.
6. Проверить @import/url()/шрифты/лицензии и разрешённые локальные ресурсы. Не исполнять JS из темы, не делать CDN/интернет обязательными, не загружать внешние шрифты на рабочем ПК автоматически. Наличие data URI в одном снимке не общий сертификат безопасности тем.
7. Выдать отчёт «применено / сопоставлено / пропущено / причина» с версией исходной темы и установленного профиля. Предусмотреть возврат к встроенному оформлению, изоляцию настроек учёток и safe fallback; полную обратную совместимость с плагинами не обещать.

## Существенные ограничения selection и переносов

CM рисует selection ниже текста. Inline wv-md-code должен оставаться прозрачным для исходных символов; reading/rendered code/pre сохраняют фон code-background. Фон поверхности/слоя и фон декорации не одно и то же. Цвет text-selection не заменяется новым фиксированным цветом коррекцией12b.

Softbreak renderer выводит настоящим BR при white-space:normal. Тема не должна скрывать семантический BR; это отображение, не добавление пробелов/LF в Markdown и не изменение буквальных LF fences. Непрозрачное/e-ink и foreground всех вторичных CM-выделений остаются открытым объёмом, не закрываются одним исправлением фона кода.

## Граница аудита Minimal8.1.7

Аудит — данные конкретного пользовательского дампа WebVault-theme-dump-20261022-231425.txt, а не установленная тема. Markdown-отчёт и JSON согласованы: minObsidianAppVersion1.9.0 относится к Obsidian, не Firefox/.NET;248304 UTF-8 байта/248290 символов,978 qualified rules/412 custom properties,0 parse errors,16 :has/1 color-mix/56 !important,11 media и27 data URL, без @import/@font-face. SHA-256 decoded CSS ee4610bc2aec92a491e3b66fc3c6e854ddcdd3be91abb9f9aa0870f6adbdfaf8. Сверка двух отчётов не повторный разбор оригинального CSS.

Указания аудита: text-selection зависит от --hl1, text-formatting от --tx3; font-editor использует цепочки окружения Obsidian и может дать invalid-at-computed-value при слепом копировании. Структурные absolute!important gutter/cm-sizer правила не переносить в принятую геометрию WebVault. Факты/Firefox113-профиль/роль каждого токена подробно остаются в [аудите](themes/minimal-8.1.7.md), данные — в JSON. Исходный CSS этим комплектом не загружается и не распространяется. MIT-уведомления заголовка и copyright2020–2024 Steph Ango (@kepano) сохранять при будущем допустимом распространении исходника/адаптации.

Открытые требования THEME-ADAPTER-01/BROWSER-01/ASSETS-01/SELECTION-02 и менеджера/личных настроек — в backlog/ТЗ. Для функциональной реализации: адресные проверки → test:all → build после успеха → отдельная публикация → браузер по npm_build.md. Docs-only не требует install/build/публикации, не меняет CSS/JS/lock/SQL/Web.config/данные.
