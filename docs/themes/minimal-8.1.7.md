# Minimal 8.1.7 — аудит для адаптера

Источник — пользовательский JSON-дамп WebVault-theme-dump-20261022-231425.txt, а не автоматически последняя версия GitHub. [Машинный отчёт](minimal-8.1.7.audit.json) · [Архитектура адаптера](../theme_adapter.md).

## Факты из переданного CSS
- manifest: Minimal 8.1.7, автор @kepano, minAppVersion 1.9.0. Это минимальная версия Obsidian, не Firefox/.NET/WebVault.
- UTF-8 содержимое CSS после декодирования дампа: 248304 байт, 248290 символов; SHA-256 `ee4610bc2aec92a491e3b66fc3c6e854ddcdd3be91abb9f9aa0870f6adbdfaf8`.
- tinycss2: 978 qualified rules с учётом вложенных media, 412 уникальных имён custom properties, ошибок разбора 0.
- 16 правил селекторов содержат :has(), 1 декларация содержит color-mix(), 56 деклараций используют !important.
- 11 media at-rules, нет @import/@font-face. Все 27 найденных CSS url() — data URI; это не обещание безопасности произвольной другой темы.

## Существенные точки совместимости
--text-selection берётся из --hl1, --text-formatting — из --tx3; тема намеренно приглушает Markdown-маркеры. --font-editor задан списком var(--font-editor-override), var(--font-text-override), var(--font-editor-theme): он рассчитывает на переменные среды Obsidian. Копирование этой строки без проверки зависимостей может дать invalid-at-computed-value.

--font-code содержит calc(font-adaptive-normal * 0.9), то есть размер, не семейство. Его нельзя механически переименовать в font-monospace. Есть стандартные роли h1–h6: size/weight/style/variant/color, и многие режимы-классы для цветовых схем.

Структурные правила используют HyperMD, cm-s-obsidian, mod-cm6, cm-sizer; среди них absolute!important для gutter. Простое добавление этих классов или безусловное подключение всего CSS может сломать принятые gutter/scroll/folding. Они требуют отдельных проверенных mapping rules, а не regexp-замены всех имён.

В e-ink вариантах выделение может быть непрозрачным белым/чёрным и требует согласованного foreground. Для вторичных выделений CM это отдельная задача; профиль не выдаётся за поддержанный e-ink режим.

## Firefox 113
:has появился в Firefox 121, поэтому в целевом 113 соответствующие правила не работают без адаптации/классов состояния. color-mix базово поддерживается в Firefox 113, но конкретная формула проверяется CSS.supports.
Основание: https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/121 и https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/113 .

## Статус
Это аудит и профиль проектирования, не установленная тема. note-theme-12 добавляет собственные семантические роли выделения/шрифтов/подсветки и стабильные классы, но не переносит 978 правил и не исполняет настройки Minimal Theme Settings/Hider/Style Settings. Переданный сырой CSS не копируется в сайт или репозиторий. Лицензия MIT находится в заголовке CSS; при будущем распространении исходника/адаптации сохранять применимые уведомления.
