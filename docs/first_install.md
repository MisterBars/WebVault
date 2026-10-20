# Новая установка WebVault

Актуальный UI: единое окно index.html, вход и настройки модальные (unified_window.md). Старая проверка health без входа больше не допускается: диагностика только локальному администратору.

## 1. IIS и файлы
Публиковать только src/WebVault.Web, не корень с .git/docs/database. Создать WebVaultPool: CLR v4.0, Integrated, ApplicationPoolIdentity. Сайт связать именно с этим пулом; пример пути D:\project\WebVault\src\WebVault.Web, HTTP 127.0.0.1:8085, свободный порт, имя узла пустое. Дать пулу чтение/выполнение исходников, не изменение:

```powershell
icacls 'D:\project\WebVault\src\WebVault.Web' /grant 'IIS AppPool\WebVaultPool:(OI)(CI)RX'
```

## 2. БД
SSMS под администратором, IIS/SQL на одной машине. Выполнить database/install по порядку: 00_database.sql, 01_grant_apppool_access.sql, 02_auth.sql, 03_user_lifecycle.sql, 04_user_management.sql, 05_user_vaults.sql. На обновлении только новые миграции после бэкапа. Не изменять ВВТ, db_owner не выдавать.

## 3. Данные и конфигурация

```powershell
New-Item -ItemType Directory -Force -Path 'D:\WebVaultData\vaults','D:\WebVaultData\history'
icacls 'D:\WebVaultData' /grant 'IIS AppPool\WebVaultPool:(OI)(CI)M'
```

Проверить все ACL: эта команда не удаляет доступ других Windows-пользователей. Каталог вне сайта, обычный локальный диск, не junction/symlink/UNC. Реальные заметки пока не переносить единственной копией.
Новая установка: скопировать Web.config.example в Web.config рядом. Обновление: сохранить существующий, дополнить вручную. Строка подключения к экземпляру этой машины, Database=WebVault, Integrated Security=True. В одной секции appSettings: AdminSetupEnabled=false, AdminSetupKey пусто, DataRoot=D:\WebVaultData. Секреты не коммитить.

## 4. Ключ и первый администратор
Сгенерировать PowerShell:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
[Convert]::ToBase64String($bytes)
```

44-символьный Base64 — временный ключ, не пароль. Не отправлять в чат/Git. В действующем Web.config временно AdminSetupEnabled=true маленькими буквами, AdminSetupKey=полученная строка. Открыть http://127.0.0.1:8085/index.html на сервере, в модальном входе раскрыть создание администратора. Ввести ключ, логин (3–64 латиница/цифры/точка/дефис/подчёркивание), имя, пароль 15–128 и повтор. После успеха СРАЗУ выключить AdminSetupEnabled=false и очистить ключ, затем войти. Форма после существующего пользователя не показывается.
При ошибке до инициализации проверять IIS/SSMS и ответ setup_status. Health требует уже созданного/вошедшего администратора, анонимного диагностического обхода нет.

## 5. Начало работы
Админ видит административное меню и диагностику, создаёт обычную личную учётку. Выход через ribbon, войти личной учёткой в той же модалке. Создать хранилище, тестовую заметку, сохранить/перечитать. Шестерёнка внизу открывает модальные настройки и смену своего пароля.

## Ошибки и перенос
setup_disabled — не true/короткий ключ; setup_key_rejected — ключи различаются; already_initialized — входить, не создавать заново; SQL DefaultAppPool — проверить пул; user_changed_reload_list — обновить список; user_has_dependencies при purge — владелец хранилища защищён; 429 — лимит, не отключать защиту наугад.
Для переноса существующих данных нужны согласованные бэкапы БД/файлов/настроек; отдельный регламент ещё предстоит. После восстановления проверить login/user пула на новой машине и отозвать старые сессии; setup не запускать заново. Независимые установки не синхронизируются. Сетевое размещение требует HTTPS и отдельной проверки. Windows 7/Framework 4.5/Firefox 113 проверять на целевом ПК, системные компоненты там не скачивать.
