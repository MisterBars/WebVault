# Базовый API авторизации

[Указатель](index.md) · [Аккаунт и сессии](session_policy.md) · [Пользователи](user_management.md) · [Схема БД](db_schema.md) · [Установка](first_install.md)

## Область и текущие канонические контракты

База статической сверки — 71a87b2799ef5d30929337f57d0eb47ba6b527cd. Полностью прочитаны AuthHandler.cs, WebApi.cs, AuthCrypto.cs, AccountHandler.cs, SetupStatusHandler.cs, декларации login.ashx/me.ashx/setup_status.ashx и каталог api/auth с blob SHA. setup/login/logout имеют одинаковый blob декларации AuthHandler; me/profile/change_password — одинаковый blob AccountHandler. Это ограниченная сверка маршрутов и общих helpers, не каталог всех .ashx, не компиляция или запуск C#/SQL/IIS.

Канонический предмет этого документа — setup/login/logout, общие проверки и границы auth-маршрутов. Детальные операции аккаунта не дублируются:

| Область | Канонический контракт |
| --- | --- |
| me/profile/свой пароль/reset/ограниченный вход/сессии | [session_policy.md](session_policy.md) |
| setup status/список/создание/rename/soft delete/совместимый SQL-purge | [user_management.md](user_management.md) |
| Необратимое удаление владельца с файлами | [folders_and_purge.md](folders_and_purge.md) |
| Личные файлы, импорт и экспорт | [file_vault.md](file_vault.md), [note_transfer.md](note_transfer.md) |

Самостоятельная регистрация — отдельное требование, не следствие наличия setup или административного создания. Ранний статус «код подготовлен; компиляция/IIS не проверены» относился к первому комплекту; нынешняя статическая сверка также не доказывает runtime-приёмку.

## Базовые маршруты и общие правила

Пути относительно сайта, префикс api/auth/:

| Маршрут | Метод / обработчик / граница |
| --- | --- |
| setup.ashx | POST, AuthHandler; создание первого администратора,201 {ok:true,next:'login'}, не автоматический вход. |
| login.ashx | POST, AuthHandler; login/password,200 {ok:true,next:'me'}, две cookies. Затем клиент отдельно вызывает me. |
| logout.ashx | POST, AuthHandler; текущая сессия и CSRF,200 {ok:true}, отзыв сессии и истечение cookies. |
| me.ashx | GET, AccountHandler; пользователь/сессия/CSRF и продление срока, включая ограниченный вход. Детальная форма ответа — session_policy.md. |
| profile.ashx / change_password.ashx | POST, AccountHandler; отдельные guards/rowVersion/лимиты — session_policy.md, не параметры login. |
| setup_status.ashx | GET, SetupStatusHandler;200 {ok:true,canSetup:...}. Показ формы не разрешение setup. |

AuthHandler.ProcessRequest и WebApi.Prepare задают JSON/UTF-8, NoCache/NoStore, nosniff, TrySkipIisCustomErrors и SuppressFormsAuthenticationRedirect. До действия отклоняется не-HTTPS запрос, если он не Request.IsLocal:403 https_required. Это серверная оценка локальности/соединения, не доверие заголовку прокси; reverse proxy требует отдельной сверки. CORS не включать.

AuthHandler.CheckPost и WebApi.Post требуют POST, X-WebVault-Request:1 и Content-Type application/json без учёта регистра/параметров после точки с запятой. При непустом Origin он должен совпасть без учёта регистра с Request.Url.GetLeftPart(Authority); отсутствие Origin этой проверкой не запрещается. Для GET эти POST-заголовки не требуются.

AuthHandler.Read и WebApi.Read<T> отдельно отклоняют ContentLength>4096 и более4096 прочитанных char из UTF-8 StreamReader с буфером4097. Первая величина — длина HTTP-тела в байтах, вторая — UTF-16 единицы .NET string; это не универсальный лимит4KiB всех API. null/неразбираемый JSON даёт400 invalid_json. logout не вызывает Read: клиент отправляет {}, но проверка JSON-содержимого/этого размера в данной ветке не выполняется.

## Первоначальный администратор и вход

setup/login обрезают только внешние пробелы login; грамматика3–64 ASCII A-Z/a-z/0-9/точка/дефис/подчёркивание, нормализация ToUpperInvariant. Пароль не Trim: login принимает1–128 UTF-16 единиц, setup дополнительно требует минимум15. displayName setup:1–100 после Trim; отдельной проверки управляющих символов в этой ветке нет, не переносить сюда более строгую profile-валидацию.

setup дополнительно требует Request.IsLocal, AdminSetupEnabled ровно true и настроенный AdminSetupKey длиной не менее40. X-Setup-Key длиной до256 сравнивается через SHA-256/Equal. Создание выполняется в Serializable-транзакции с COUNT_BIG auth.Users под TABLOCKX,HOLDLOCK; любой существующий пользователь запрещает повторный setup. PBKDF2 выполняется до проверки пустоты таблицы; setup_status не резервирует право создания.

login читает запись по NormalizedLogin под UPDLOCK,ROWLOCK в транзакции. Успех требует существующую активную учётку, поддержанные algorithm/version, отсутствие текущей блокировки и совпадение хеша. Неизвестная/неподдержанная учётка также проходит вычисление на фиктивной соли. Неуспех отвечает401 invalid_login_or_password без различения отсутствия/неактивности/блокировки. Пять неудач существующей активной незаблокированной учётки устанавливают блокировку на15 минут; истёкшая блокировка начинает счёт заново, успешный вход сбрасывает счётчик/LockoutUntilUtc.

Rate вызывается для setup/login после CheckPost, но до PasswordSlots.Wait(0) и Read. Ключ — UserHostAddress в HttpRuntime.Cache процесса: до20 принятых квотой запросов, каждый такой запрос ставит истечение через10 минут. Отклонённый по достигнутой квоте запрос срок не продлевает. Ошибочный JSON, неверный setup-ключ и server_busy после Rate могут расходовать квоту. Это не только счётчик неверных паролей и не распределённый limiter; restart/вытеснение кэша теряет состояние. AuthHandler допускает2 одновременные операции setup/login, без очереди ожидания. AccountHandler имеет отдельный Slot(1) и account-security Rate; CreateSlot других handlers этим не проверен.

<a id="пароли-и-сессии-сохранённые-параметры-первого-комплекта"></a>

## Пароли и сессии

Параметры прежнего описания сверены с текущими прочитанными исходниками, а не просто перенесены как исторический статус. AuthCrypto использует PBKDF2-HMAC-SHA256 через Windows CNG BCryptDeriveKeyPBKDF2, UTF-8 пароль, новую соль32 байта и результат32 байта. Новые хеши —600000 итераций/version1; Password допускает хранимые iterations600000–2000000, вне диапазона выбрасывает исключение, не ослабляет алгоритм. Lazy-самопроверка известным вектором выполняется перед рабочим Password; отказ CNG/self-test — серверная ошибка, не fallback на слабый алгоритм. Целевая машина отдельно не проверялась.

Токены —32 случайных байта в Base64, в БД SHA-256 UTF-8 строки токена. Cookies WebVaultSession/WebVaultCsrf: HttpOnly, Secure по IsSecureConnection, Path приложения, без persistent Expires до удаления. Прочитанный код не задаёт SameSite; POST-защита на него не полагается. Cookie-token требует44 символа и декодирование в32 байта; отсутствие/неверный формат даёт401 unauthenticated. Hash Equal сравнивает байты без раннего выхода по их содержимому, но сначала проверяет null/длины.

login создаёт ExpiresUtc=now+30 минут и AbsoluteExpiresUtc=now+8 часов. Текущий AccountHandler.Me проверяет сессию/активность/DeletedUtc, CSRF-cookie и обновляет LastSeenUtc/ExpiresUtc до min(now+30 минут,absolute), повторно проверяя валидность в UPDATE. Заголовок X-CSRF-Token для GET me не нужен. WebApi.RequireUser само по себе срок не продлевает; нельзя распространять это на весь файловый API без проверки его обработчиков.

Собственная смена пароля сохраняет SessionId с вращением токенов и отзывает остальные сессии, административный reset отзывает все сессии цели: детальный контракт — session_policy.md. Наличие приватного AuthHandler.Me не делает его обслуживающим me.ashx: фактическая декларация ведёт в AccountHandler.

logout использует AuthHandler.Current, а не WebApi.RequireUser: проверяет TokenHash/RevokedUtc/оба срока/IsActive, без отдельного условия DeletedUtc или MustChangePassword в этом SELECT. Затем проверяются CSRF-cookie и X-CSRF-Token по хешу сессии; заголовку проверяется длина44, но отдельного Base64-декодирования заголовка нет. Отзыв по SessionId и истечение обеих cookies завершают успешный ответ. Повтор после отзыва обычно401, не гарантированно идемпотентный200; клиент может отдельно считать401 завершённым выходом. Не объявлять этим различием обход прав без проверки жизненного цикла пользователя.

## Ошибки и диагностика

| HTTP | Коды в описанной области |
| --- | --- |
|400|invalid_json, invalid_credentials_format; setup:password_too_short/invalid_display_name.|
|401|invalid_login_or_password либо unauthenticated; malformed CSRF-cookie также401, а не всегда403.|
|403|https_required, request_header_required, origin_rejected, csrf_rejected; setup:local_only/setup_disabled/setup_key_rejected. AccountHandler дополнительно ограничивает forced change по своему контракту.|
|404|not_found для неподдержанного действия после предшествующих проверок; это не гарантия такого же JSON от несуществующего IIS-файла.|
|405|method_not_allowed с Allow ожидаемого метода.|
|409|already_initialized при непустой auth.Users; profile/management имеют отдельные конфликты.|
|413|request_too_large в вызывающих Read ветках.|
|415|json_required.|
|429|rate_limited либо server_busy у AuthHandler; account-security лимит отдельный.|
|500|server_error/errorId; Trace пишет ID и тип исключения, не пароль/stack клиенту. Это не доказательство настроенного постоянного журнала установки.|

Порядок проверок влияет на первую ошибку: HTTPS до метода; POST-guards до Rate/Read; logout до Rate/Read. Не повторять login/setup вслепую после сетевой неопределённости: сначала проверить сессию через me либо возможность setup через setup_status. canSetup=false не универсальный ответ при недоступной БД: если условия локального включённого setup выполнены, ошибка запроса к БД даёт500. Удалённый HTTPS GET setup_status возвращает canSetup=false без этой ветки запроса; удалённый HTTP отклоняется Prepare.

## Установка и первоначальный администратор

Следовать [first_install.md](first_install.md): SQL00–07, обновление только подтверждённо неприменёнными миграциями после бэкапа БД/DataRoot. Рабочий Web.config не заменять, appSettings/customHeaders не дублировать. Текущий вход setup — index.html, не старая отдельная auth.html.

Способ генерации временного ключа, не выполненная этой редактурой команда:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
[Convert]::ToBase64String($bytes)
```

Ключ не присылать в чат/Git. Обычно AdminSetupEnabled=false, AdminSetupKey пусто; для новой пустой тестовой установки true временно, после создания сразу false/очистка ключа. Сервер запрещает повторный setup при пользователях даже при забытом включении; видимость формы не защита. Защитные system.webServer/httpProtocol/customHeaders переносить из примера без дублирования секций и замены рабочей конфигурации.

## Проверка и незавершённый охват

План, не прогон: методы/Allow; локальный HTTP и удалённый HTTPS/HTTP; POST заголовки/MIME/Origin; границы байтов и UTF-16 тела; неизвестный/неактивный/заблокированный login;20 запросов/истечение квоты/занятость; конкурентный первый setup; неверные cookies/CSRF/отзыв/оба срока; повтор logout; отказ БД/CNG и отсутствие внутренних сведений в ответе. Использовать изолированную тестовую установку, не расходовать лимиты/блокировать рабочие учётки ради документации. Полные планы аккаунтов и критерии — session_policy.md/user_management.md.

Источники исходного проектного решения: OWASP Password Storage Cheat Sheet (PBKDF2-HMAC-SHA256600000), Microsoft BCryptDeriveKeyPBKDF2 (Windows7). Эта редактура не новая внешняя проверка этих источников. Полная инвентаризация HTTP, все вызывающие WebApi маршруты, reverse proxy и runtime-среда остаются открытыми; тесты/build/публикация не выполнялись.
