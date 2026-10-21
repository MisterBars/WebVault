# Указатель документации WebVault

[README](../README.md). «Этап» — описание соответствующего изменения, не гарантия актуальности всех старых ограничений.

## Установка, сборка, проверки
- [first_install.md](first_install.md) — базовая установка IIS/SQL/DataRoot и первый администратор; список SQL до 05, дополнения 06/07 ниже.
- [npm_build.md](npm_build.md) — установка зависимостей дома, test/build, lock, перенос JS и ошибки.
- [cm6_setup.md](cm6_setup.md) — первоначальная интеграция CM; Markdown позже расширен.
- [deployment.md](deployment.md) — исторический этап; отдельные HTML-страницы устарели, использовать first_install/unified_window.
- [TEST_CHECKLIST.md](TEST_CHECKLIST.md) — базовый чек-лист, дополнять новыми проверками.
- [SQL-скрипты](../database/install) — 00–07, при обновлении только неприменённые после бэкапа.

## Аккаунты
- [account_security.md](account_security.md) — безопасность, этап 06.
- [session_policy.md](session_policy.md) — актуализированные сессии и временный пароль; приоритет над старой политикой выхода.
- [password_change.md](password_change.md) — этап смены пароля, сессии сверять выше.
- [users.md](users.md) — ранний этап учётных записей.
- [user_management.md](user_management.md) — управление пользователями; удаление владельца дополняет folders_and_purge.
- [ui_and_users.md](ui_and_users.md) — ранний UI и пользователи.

## Файлы и перенос
- [note_transfer.md](note_transfer.md) — НОВОЕ: импорт нескольких .md, экспорт одной заметки; исходники требуют сборки/проверки. ZIP и папки позже.
- [file_vault.md](file_vault.md) — этап файлового хранилища.
- [folders_and_purge.md](folders_and_purge.md) — этап 07, папки и административное удаление владельца; не корзина заметок.
- [trash_ui.md](trash_ui.md) — корзина, восстановление, ограничения удаления.
- [multi_selection.md](multi_selection.md) — последующий групповой UI, Ctrl/Shift, drag/прокрутка; Delete/Ctrl+A дерева по отзыву пользователя пока не работают.

## Редактор
- [editor_autosave.md](editor_autosave.md) — автосохранение и первоначальный просмотр; Markdown потом заменён при наличии CM.
- [live_preview_blocks.md](live_preview_blocks.md) — последний блочный просмотр/чтение, границы поддержки.
- [mode_slider.md](mode_slider.md) — переключатель; описанный старый мост чтения позже заменён в live_preview_blocks.
- [unified_window.md](unified_window.md) — единое index.html, модальные вход/настройки.
- [theme_compatibility.md](theme_compatibility.md) — адаптация тем.

## Архитектура и план
- [API_OVERVIEW.md](API_OVERVIEW.md) — обзор API этапа; новые маршруты сверять с кодом.
- [db_schema.md](db_schema.md) — схема, изменения сверять с SQL.
- [application_design.md](application_design.md) — проектирование.
- [project_overview.md](project_overview.md) — ранний снимок; текущее состояние в README.
- [ТЗ 001](specifications/001-webvault-v0.1.md) — исходные требования.
- [ТЗ 002](specifications/002-editor-files-and-accounts.md) — редактор/файлы/аккаунты.
- [next_steps.md](next_steps.md) — согласованные требования, не готовые функции; перенос .md реализуется поэтапно, текущий этап описан в note_transfer.md.

Новый документ добавлять сюда с кратким назначением; старую политику/маршруты помечать заменяющими инструкциями.
