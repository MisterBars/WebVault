# Перенос исходников и обновление рабочей копии

[README](../README.md) · [Указатель](index.md) · [Сборка и проверки](npm_build.md) · [Установка IIS/SQL](first_install.md)

## Что переносится

Репозиторий MisterBars/WebVault, ветка main. Git переносит только закоммиченные файлы. Bundle, DataRoot, настоящие заметки/вложения, БД, ACL и рабочий Web.config не считать автоматически перенесёнными. Рабочий сайт, исходники, зависимости и личные данные — разные части установки.

## Новая копия

Clone выполнять только в новую отсутствующую или пустую папку, не поверх существующего checkout/DataRoot:

```powershell
Set-Location D:\project
git clone --branch main --single-branch https://github.com/MisterBars/WebVault.git WebVault
if ($LASTEXITCODE -ne 0) { throw 'Clone failed; stop' }
Set-Location D:\project\WebVault
git status -sb
git log -1 --oneline
Test-Path .\tools\cm6\package.json
Test-Path .\tools\cm6\package-lock.json
```

## Существующая копия: сначала сверка

```powershell
Set-Location D:\project\WebVault
git status -sb
git branch --show-current
git rev-parse HEAD
git --no-pager diff --stat
git --no-pager diff --cached --stat
git fetch origin
if ($LASTEXITCODE -ne 0) { throw 'Fetch failed; stop' }
git status -sb
git rev-parse origin/main
git --no-pager log --oneline HEAD..origin/main
```

Fetch получает коммиты, но не заменяет рабочие файлы. До merge проверить ветку main, staged/unstaged diff и untracked пути. При любом локальном изменении сначала остановиться и определить его назначение. Не удалять и не добавлять автоматически untracked vendor/; происхождение bundle проверяется отдельно. Даже одинаковая локальная и входящая правка требует сверки, а не предположения об отсутствии конфликта.

После проверки чистоты рабочей базы либо отдельного согласованного сохранения локальных изменений:

```powershell
git merge --ff-only origin/main
if ($LASTEXITCODE -ne 0) { throw 'Fast-forward failed; stop' }
git status -sb
git log -1 --oneline
```

Если отчёт комплекта задаёт конкретный SHA, вместо origin/main использовать этот SHA, чтобы не включить непроверенные последующие коммиты. При ошибке остановиться; не применять reset --hard, clean, force push или автоматический stash. Не делать git add . ради синхронизации.

Если локальный файл уже содержит входящее исправление, сначала сравнить его с целевым коммитом, проверить index, сохранить отдельную копию вне репозитория и согласовать точечную синхронизацию. Это не разрешение массового restore или удаления локальных экспериментов.

## Сборка, публикация и просмотр

Единый порядок и команды находятся в [npm_build.md](npm_build.md): адресные тесты → npm run test:all → только после успеха npm run build → отдельная публикация и браузерная проверка. Все Node-команды выполняются из D:\project\WebVault\tools\cm6. Повторная установка зависимостей без изменения manifests обычно не нужна; npm ci использовать только для согласованной установки из lock. Сокращённый npm test и shell glob не заменяют штатный полный runner.

Для docs-only читать изменённые документы и diff; сборка и публикация сайта не нужны. Для функционального комплекта сохранить заметки и резервные копии сайта/БД/DataRoot, Web.config и ACL; публиковать только согласованный состав src/WebVault.Web. Не копировать корень Git, docs/tools/node_modules и не подменять данные. Ctrl+F5 и тестовая копия заметки обязательны для отдельной браузерной проверки; успешная сборка её не заменяет.

После каждого обновления сверять фактический HEAD, состав коммита и status. Команды получения/просмотра конкретного комплекта предоставляются вместе с его SHA; тесты, не запускавшиеся на этой базе, не считать пройденными.

## Диагностика

- ENOENT package.json: проверить checkout/HEAD и tools/cm6; не создавать manifest вручную.
- Несовпадение manifests при npm ci: сохранить вывод, сравнить package.json/lock, не удалять lock.
- main отстаёт: fetch и проверенный fast-forward; push старой локальной ветки не обновляет checkout.
- Access denied: проверить занятость IIS/редактором и права, сохранить копию; src/tools не удалять и clean/reset не обходить ошибку.
- NODE_EXTRA_CA_CERTS указывает на отсутствующий файл: проверить переменную и согласовать корпоративный CA; не отключать strict-ssl.
- npm audit: рассматривать конкретный пакет отдельно, не выполнять audit fix --force автоматически.
- CRLF/UTF-8 warnings: проверить наличие/содержимое .gitattributes, байты и diff; не переформатировать весь проект ради предупреждения.

Перенос существующей БД и DataRoot требует согласованных резервных копий и отдельного регламента. Независимые установки не синхронизируются автоматически. Не путать перенос исходников с восстановлением данных или развёртыванием сайта.
