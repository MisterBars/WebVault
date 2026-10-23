# Перенос WebVault между компьютерами — краткая актуальная инструкция

Репозиторий `MisterBars/WebVault`, ветка `main`. Сборка/публикация идут отдельно от личных данных.

## Короткий чек-лист

1. **Выяснить, что переносим.** Git переносит только закоммиченные файлы. Рабочий сайт требует отдельно перенести web bundle; DataRoot, настоящие заметки, SQL, ACL и рабочий Web.config не синхронизируются через Git.
2. **Проверить локальный clone.** Открыть D:\project\WebVault, проверить ветку main, HEAD и git status. Если есть M/A/D/?? или staged файлы, не делать pull/merge, reset --hard или clean; сохранить их и разобраться с diff.
3. **Обновить исходники.** На чистом main выполнить git fetch origin, затем git merge --ff-only origin/main. Если fast-forward не проходит, остановиться и разобрать расхождение.
4. **Собрать JavaScript только на ПК сборки.** Проверить tools/cm6/package.json и package-lock.json. Для чистой установки использовать npm ci только при согласованном lock, затем npm test, отдельные тесты комплекта и npm run build; при любой ошибке остановиться.
5. **Опубликовать на IIS отдельно.** Сохранить заметки; сделать backup web root, БД и DataRoot; сохранить конкретный рабочий Web.config и ACL. Перенести согласованные src/WebVault.Web assets, bundle и handlers. Не подменять DataRoot/БД и не копировать корень Git.
6. **Проверить рабочий сайт.** Ctrl+F5, вход, тестовая копия заметки, source/dynamic/reading, свойства/ссылки, undo/autosave. Успешный npm test/build не заменяет браузерную проверку.

## Если что-то пошло не так

- `npm install` сообщает ENOENT package.json: проверить checkout/HEAD, затем `tools/cm6`. Не создавать manifest вручную.
- `npm ci` сообщает о несовпадающих manifests: не удалять lock; сохранить вывод, сравнить package.json/lock.
- `main` отстаёт на много commits: `git fetch`, проверить status и fast-forward. Push локальной старой ветки не обновляет checkout.
- `Access denied`: не удалять `src`/`tools`, не обходить `clean/reset`; проверить занятость IIS/редактором и права, сохранять копию.
- `NODE_EXTRA_CA_CERTS` указывает на отсутствующий файл: проверить переменную и согласовать корпоративный CA; не отключать `strict-ssl`.
- `npm audit`: рассматривать конкретный пакет отдельно; не запускать `npm audit fix --force` автоматически.
- CRLF/UTF-8 warnings: проверить `.gitattributes`, байты и `git diff`; не переформатировать весь проект ради предупреждения.

## Команды clone новой копии

```powershell
Set-Location D:\project
git clone --branch main --single-branch https://github.com/MisterBars/WebVault.git WebVault
if ($LASTEXITCODE -ne 0) { throw 'clone failed' }
Set-Location D:\project\WebVault
git status -sb
git log -1 --oneline
Test-Path .\tools\cm6\package.json
Test-Path .\tools\cm6\package-lock.json
```

Clone выполнять только в пустую новую папку. Не поверх существующего checkout/DataRoot.

## Команды обновления существующей копии

```powershell
Set-Location D:\project\WebVault
git status -sb
git fetch origin
if ($LASTEXITCODE -ne 0) { throw 'fetch failed' }
git status -sb
```

Только если status чистый и ветка — main:

```powershell
git merge --ff-only origin/main
if ($LASTEXITCODE -ne 0) { throw 'fast-forward failed; stop' }
git status -sb
git log -1 --oneline
```

## Команды сборки

```powershell
Set-Location D:\project\WebVault\tools\cm6
node --version
npm --version
Test-Path .\package.json
Test-Path .\package-lock.json
npm ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed; stop' }
npm test
if ($LASTEXITCODE -ne 0) { throw 'npm tests failed; stop before build' }
node --test *.test.mjs
if ($LASTEXITCODE -ne 0) { throw 'additional tests failed' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'build failed; keep accepted bundle' }
Get-Item ..\..\src\WebVault.Web\assets\vendor\webvault-cm6.js |
    Select-Object FullName, Length, LastWriteTime
```

Для разработки с актуальным `package.json` без согласованного lock сначала остановиться и сверить изменения, а не выполнять `npm ci` вслепую. `node --test *.test.mjs` включает все тесты каталога; если проект добавит тесты, требующие внешних ресурсов, пользоваться точным списком команд профильной инструкции.
