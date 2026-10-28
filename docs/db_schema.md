# Схема служебной БД WebVault

[Указатель](index.md) · [Установка SQL 00–07](first_install.md) · [Аккаунт и сессии](session_policy.md) · [Пользователи](user_management.md) · [Удаление владельца](folders_and_purge.md)

## Область и основания

Целевая БД — WebVault, SQL Server Express 2014. Текст заметок хранится в файловой системе, не в таблицах ниже. Редакция статически сопоставлена с database/install/02_auth.sql–07_folders_and_purge.sql; это не применение миграций, проверка рабочей БД, C#/SQL/IIS-прогон или полный аудит обработчиков.

Исполняемые auth/account/admin маршруты существуют; раннее «API ещё нет» не текущий статус. Контракты сессий/паролей и управления пользователями находятся в профильных руководствах. Точные параметры алгоритма определяет C#-реализация, SQL не вычисляет парольные хеши; поля алгоритма/версии сохраняют возможность обновления формата.

## Установка и изменения схемы

Каноническая пошаговая новая установка — first_install.md: IIS-пул WebVaultPool и последовательность SQL 00–07. На обновлении — только подтверждённо неприменённые скрипты после согласованного бэкапа БД и DataRoot. Не повторять первоначальный setup, не выдавать приложению db_owner и не отключать FK.

| Скрипт | Изменение |
| --- | --- |
| 00/01 | БД/схемы и доступ Windows-пула/роли; полный регламент в first_install.md. |
| 02_auth.sql | Базовые auth.Users/auth.UserSessions, ограничения/индексы/объектные права, без создания аккаунтов/паролей/сессий. |
| 03_user_lifecycle.sql | Добавляет nullable DeletedUtc datetime2(3); мягкое удаление не удаляет файлы и не освобождает логин. |
| 04_user_management.sql | Добавляет объектное DELETE на auth.Users роли webvault_app, не db_owner. |
| 05_user_vaults.sql | storage.UserVaults и FK владельца; исходно SELECT/INSERT/UPDATE без DELETE/каскада. |
| 06_account_security.sql | MustChangePassword bit NOT NULL DEFAULT(0) WITH VALUES и auth.PasswordResetEvents; прежние учётки получают 0, пароли не меняются. |
| 07_folders_and_purge.sql | storage.PurgeJobs/AssertPurgeSchema, права журнала/проверки схемы и DELETE на UserVaults для отдельного purge. Сам скрипт никого не удаляет. |

02 выполняется в транзакции с XACT_ABORT/TRY-CATCH/откатом при ошибке, создаёт отсутствующие таблицы, но не обновляет произвольную структуру уже существующих. Повторный запуск не универсальный механизм миграций; первого администратора не создаёт. Остальные скрипты имеют собственные проверки зависимостей, их нельзя считать единым атомарным пакетом только по порядку имён.

## auth.Users

| Поле | Назначение / тип |
| --- | --- |
| UserId | int IDENTITY, PK, внутренний ID. |
| Login | nvarchar(64), отображаемый логин. |
| NormalizedLogin | nvarchar(64), Latin1_General_100_BIN2, UNIQUE; нормализация C# описана в user_management.md. |
| DisplayName | nvarchar(100), имя, email не требуется и уникальность не задана. |
| PasswordHash / PasswordSalt | varbinary(128) / varbinary(64), результат KDF и индивидуальная соль, не открытый пароль. Это ёмкость SQL-поля, не требование всегда писать 128/64 байта. |
| PasswordAlgorithm | varchar(40), имя алгоритма/PRF. |
| PasswordIterations / PasswordVersion | int / smallint, трудоёмкость и версия, версия DEFAULT(1). |
| IsAdmin / IsActive | bit DEFAULT(0)/DEFAULT(1), роль приложения и разрешение входа, не роль SQL Server. |
| FailedLoginCount | int DEFAULT(0), CHECK >=0. |
| LockoutUntilUtc | datetime2(3) NULL, временная блокировка. |
| CreatedUtc / UpdatedUtc / PasswordChangedUtc | datetime2(3), defaults SYSUTCDATETIME(); последующее UpdatedUtc обновляет код, автоматического триггера в прочитанных скриптах нет. |
| LastLoginUtc | datetime2(3) NULL до первого входа. |
| RowVersion | rowversion, конкурентный маркер, не дата/время. |
| DeletedUtc | datetime2(3) NULL, миграция 03. |
| MustChangePassword | bit NOT NULL DEFAULT(0), миграция 06, ограниченный вход после reset. |

Базовые CHECK требуют непустые Login/NormalizedLogin/DisplayName, длину хеша не меньше 32 байтов, соли не меньше 16, положительные iterations/version и непустое имя алгоритма. Они не заменяют серверную грамматику логина/политику пароля/валидацию каждого действия. Уникальность NormalizedLogin распространяется и на мягко удалённые записи; DisplayName не уникален.

## auth.UserSessions

| Поле | Назначение / тип |
| --- | --- |
| SessionId | bigint IDENTITY, PK, внутренний ID, не секретный токен. |
| UserId | int, FK на auth.Users без каскадного удаления. |
| TokenHash / CsrfTokenHash | binary(32), SHA-256 случайных токенов; исходные секреты не хранить в БД/журнале. |
| CreatedUtc / LastSeenUtc | datetime2(3), defaults SYSUTCDATETIME(). |
| ExpiresUtc / AbsoluteExpiresUtc | datetime2(3), idle/абсолютный срок. |
| RevokedUtc | datetime2(3) NULL, отзыв. |

TokenHash уникален; дополнительные индексы UserId и ExpiresUtc. CHECK: ExpiresUtc > CreatedUtc, AbsoluteExpiresUtc >= ExpiresUtc, LastSeenUtc >= CreatedUtc. Строка не означает действительность сессии: сервер проверяет пользователя, отзыв и оба срока; атомарное продление не превышает абсолютный срок. Политика собственной смены сохраняет текущий SessionId с вращением токенов и отзывом остальных, административные действия отзывают сессии цели — session_policy.md. Раннее общее обещание нового входа после любой смены не текущий контракт.

## auth.PasswordResetEvents

Миграция 06: EventId bigint IDENTITY PK, ActorUserId int, TargetUserId int, CreatedUtc datetime2(3) DEFAULT SYSUTCDATETIME(). Все поля NOT NULL. Роль получает INSERT, не право UI-просмотра журнала. FK на учётки намеренно нет: удаление не должно стирать/блокировать reset-аудит. Пароли/токены/текст заметок в этих полях не хранятся; политика просмотра/очистки — отдельный объём.

## storage.UserVaults

Миграция 05: VaultId uniqueidentifier PK, UserId int NOT NULL UNIQUE с FK на auth.Users, CreatedUtc datetime2(3) DEFAULT SYSUTCDATETIME(), все поля NOT NULL. Один реестр на пользователя; GUID не зависит от логина. Файлы и history размещаются по DataRoot/GUID согласно file_vault.md, не выбираются произвольным путём клиента.

Изначальное отсутствие DELETE/каскада в 05 защищало владельца от старого SQL-purge. 07 добавляет DELETE для отдельной согласованной очистки, а не разрешение обходить FK вручную.

## storage.PurgeJobs и проверка зависимостей

Миграция 07: JobId uniqueidentifier PK; TargetUserId int UNIQUE; ActorUserId int; nullable VaultId uniqueidentifier и RootHash binary(32); Status varchar(20), nullable LastError varchar(80); CreatedUtc/UpdatedUtc datetime2(3) DEFAULT SYSUTCDATETIME(). Остальные перечисленные поля NOT NULL. CHECK допускает Started/RetryRequired/Complete. Журнал без FK хранит ID/состояние/ошибку, не секреты или содержимое заметок.

storage.AssertPurgeSchema выполняется WITH EXECUTE AS OWNER для видимости метаданных. Допускает известные входящие FK на Users от UserSessions/UserVaults, отклоняет иные FK на Users и любые FK на UserSessions/UserVaults. Новые зависимости требуют согласования очистки, не снятия ограничений. Стадии, RootHash, лимиты/повторы/частичная очистка — folders_and_purge.md; SQL и ФС не общая атомарная транзакция.

## Итоговые объектные права роли

- auth.Users: SELECT/INSERT/UPDATE из 02, DELETE из 04.
- auth.UserSessions: SELECT/INSERT/UPDATE/DELETE из 02.
- storage.UserVaults: SELECT/INSERT/UPDATE из 05, DELETE из 07.
- auth.PasswordResetEvents: INSERT из 06.
- storage.PurgeJobs: SELECT/INSERT/UPDATE и AssertPurgeSchema: EXECUTE из 07.

Это выданные прочитанными скриптами права, не аудит всех фактических GRANT/DENY рабочей БД. Создание таблиц/db_owner приложению не предоставляются этими объектными GRANT. Разделение ролей пользователей проверяет сервер, не отдельный SQL-login каждой учётки. Скрипты 04/07 сами пользователей или файлы не удаляют.

## Проверки и остаток

На отдельной тестовой установке сверять применённые миграции/поля/индексы/FK/GRANT, login/user пула и отсутствие лишних прав. Сценарии setup/паролей/сессий — session_policy.md, management — user_management.md, файловая очистка — folders_and_purge.md. Наличие DDL и документа не успешное выполнение этих сценариев или проверка бэкап-восстановления.

Полная архитектурная ревизия и трассировка требований БД продолжаются. Статические скрипты не доказывают, что конкретная рабочая БД обновлена; SQL/Web.config/DataRoot этой редактурой не менялись.
