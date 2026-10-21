# Указатель документации WebVault

[README](../README.md). Этап — исторический контекст, не гарантия актуальности всех ограничений.

## Установка и сборка
- [first_install.md](first_install.md) — IIS/SQL/DataRoot/администратор; базовый SQL до05, дополнения06/07 отдельно.
- [npm_build.md](npm_build.md) — зависимости, lock, test/build, перенос JS и ошибки.
- [cm6_setup.md](cm6_setup.md) — первое подключение CM; Markdown позже расширен.
- [deployment.md](deployment.md) — историческое развёртывание; отдельные HTML-страницы устарели.
- [TEST_CHECKLIST.md](TEST_CHECKLIST.md) — базовый чек-лист, дополнять новыми проверками.
- [database/install](../database/install) — SQL00–07; только неприменённые на обновлении после бэкапа.

## Аккаунты
- [account_security.md](account_security.md) — безопасность, миграция06.
- [session_policy.md](session_policy.md) — уточнённые сессии/временный пароль, приоритет над старыми правилами выхода.
- [password_change.md](password_change.md) — этап смены пароля, сессии сверять выше.
- [users.md](users.md) — ранние аккаунты.
- [user_management.md](user_management.md) — управление пользователями, удаление владельца дополнено folders_and_purge.
- [ui_and_users.md](ui_and_users.md) — ранний UI пользователей.

## Файлы и перенос
- [note_transfer.md](note_transfer.md) — .md и НОВЫЙ ZIP-перенос групп/папок, обозреватель назначения, безопасность/лимиты; ZIP требует сборки и проверки.
- [file_vault.md](file_vault.md) — этап файлового хранилища.
- [folders_and_purge.md](folders_and_purge.md) — папки и административное удаление владельца, этап07; не корзина заметок.
- [trash_ui.md](trash_ui.md) — операции корзины/восстановления.
- [multi_selection.md](multi_selection.md) — групповой UI и drag/прокрутка; Delete/Ctrl+A дерева по отзыву пока не работают.

## Редактор
- [editor_autosave.md](editor_autosave.md) — автосохранение и первоначальный просмотр, позднее заменённый при CM.
- [live_preview_blocks.md](live_preview_blocks.md) — блочный dynamic/read и ограничения.
- [mode_slider.md](mode_slider.md) — переключатель, старый мост чтения позже заменён.
- [unified_window.md](unified_window.md) — единое index.html с модальными входом/настройками.
- [theme_compatibility.md](theme_compatibility.md) — адаптация тем.

## Архитектура и план
- [API_OVERVIEW.md](API_OVERVIEW.md) — API этапа, новые маршруты сверять с кодом.
- [db_schema.md](db_schema.md) — схема, сверять с миграциями.
- [application_design.md](application_design.md) — проектирование.
- [project_overview.md](project_overview.md) — ранний снимок, текущее состояние в README.
- [ТЗ001](specifications/001-webvault-v0.1.md) — исходные требования.
- [ТЗ002](specifications/002-editor-files-and-accounts.md) — редактор/файлы/аккаунты.
- [next_steps.md](next_steps.md) — согласованный план; реализуемый перенос отдельно актуализирован в note_transfer.md.

Новые документы добавлять сюда с назначением, устаревшие маршруты/политики явно помечать.
