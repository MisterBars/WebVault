# Режимы редактора и общая прокрутка

[Указатель](index.md) · [Workspace](workspace_layout.md) · [Сохранение](editor_autosave.md) · [Markdown](live_preview_blocks.md) · [Свойства](properties_panel.md) · [Folding](heading_folding.md) · [Backlog](next_steps.md)

## Область и подключение

Статическая база b709f133003a40a76d59416477be3093f98b4334: mode_slider.js/editor.js, editor_features.js/application.js и workspace.css. Это не Node/test:all/build/IIS/браузер или проверка установленного bundle. installModeSlider(change) создаёт UI; callback editor.js реально меняет режим. Скрытая markdownToggle — резервный preview, не основной маршрут CM и не ограничение современного Markdown.

## Три режима

- «Исходный код» (0): Markdown в CM с исходным оформлением/штатным folding.
- «Динамический просмотр» (1): редактируемый CM с нативным текстом и локальной разметкой; сложные конструкции сохраняют fallback. Начальный режим редактора.
- «Просмотр» (2): отдельная reading-область, не свободный редактор тела; разрешённые операции свойств/задач имеют собственные guards/транзакции.

Режим сохраняется для следующей заметки в том же экземпляре, не после reload и не как постоянная личная настройка. Reopen через setter area.value создаёт новый EditorState и может сбросить Undo; это не переключение режима. Вкладки/split/восстановление истории — отдельные требования.

## Переключение, история и черновики

Callback сначала вызывает finishTableDraft(); отказ сохраняет прежний режим/активную позицию. Затем меняются currentMode, CM/reading и modeEffect/heading folding. Текст не присваивается, view.setState не вызывается, история не пересоздаётся. При входе в dynamic пустой курсор перед концом frontmatter может переместиться за frontmatter: неизменность selection не обещана.

Reading строится из текущего CM-документа, не нового серверного чтения. Смена отображения не доказывает save, полноту Markdown или всех folds. Для source/live передаются эффекты согласования native/rendered heading folds и аннотация сохранения; детали — [heading_folding.md](heading_folding.md).

Capture-обработчик editor_features.js может перед мышиным click сохранить dirty при временном readOnly. Failed/busy не разрешают автоматическое продолжение; повтор click требует успешной записи, той же identity и отсутствия нового dirty. Клавиатура mode_slider.js вызывает choose напрямую без click: обязательное сохранение перед любым переключением не гарантируется. [Контракт сохранения](editor_autosave.md).

finishTableDraft не универсальная защита незавершённых native-полей свойств. До смены режима завершить/отменить их по [properties_panel.md](properties_panel.md). Несколько native-черновиков и их восстановление — отдельный оставшийся объём, не следствие сохранённого CM-документа.

## Управление и доступность

Radiogroup/radio, aria-checked и roving tabindex: Tab на активной позиции. ArrowRight/Down и ArrowLeft/Up циклически выбирают следующий/предыдущий режим, Home/End — первый/последний. Успешный клавиатурный выбор фокусирует кнопку; отказ callback не меняет active.

Активная позиция показывает иконку/подпись, остальные — иконку с title/aria-label. Узкая подпись сокращается без потери доступного имени. Анимация подложки220 мс, prefers-reduced-motion отключает transition. ARIA не заменяет проверки Firefox113/клавиатуры/масштаба/контраста.

## Общая прокрутка

Правила assets/css/workspace.css ограничены #notesPane:

- .markdown-source-view: overflow-y:scroll; overflow-x:auto.
- .webvault-editor-container: height:auto; min-height:100%; display:block.
- .cm-editor: height:auto; min-height:300px.
- .cm-scroller: overflow:visible; max-height:none.
- .wv-reading-pane: height:auto; max-height:none; overflow:visible.

Необходимые !important переопределяют прежнюю раскладку/встроенные стили. Полоса справа у области заметки, не у центрированной текстовой колонки. Inline title/свойства/тело идут вместе; верхняя шапка/панель действий/дерево не входят в scroll. Не менять Markdown/реальные пустые строки ради визуальных отступов.

Внешний scroll не синхронизирует смысловую позицию source/reading. [Gutters](editor_gutters.md) и [heading folding](heading_folding.md) имеют собственные контракты; существующая основа не новая отсутствующая функция. Folding других контейнеров и регрессия остаются открытыми.

## План проверки

Сценарии, не отчёт о новом прогоне:

- Три позиции мышью/стрелками/Home/End, отказ finishTableDraft, Tab/фокус и соответствие aria-checked режиму.
- Dirty отдельно мышью/клавиатурой, busy/ошибка, ввод во время запроса; маршруты не тождественны.
- Undo/Redo до/после смены режима без reopen; отдельно сброс истории при reopen.
- Черновики свойств/ячеек, смена заметки/пользователя, frontmatter при source → dynamic.
- Heading folds/source folding без ложного YAML-folding.
- Полоса справа в трёх режимах, общий scroll над свойствами/текстом, уход inline title, отсутствие второго вертикального scroll/горизонтального скачка.
- Курсор/ввод внизу длинной заметки, широкие таблицы/длинный код, узкая панель/темы/масштаб/reduced motion.

Функциональная цепочка — [npm_build.md](npm_build.md): адресные → test:all → build после успеха → публикация → браузер. CSS-only не требует пересборки неизменённого JS, но требует проверки затронутого UI. Docs-only не меняет CSS/JS/bundle и не требует публикации.

## Граница сведения

[История](changelog/2026-10.md) хранит события, [исторические свидетельства](npm_build.md#исторические-свидетельства-рабочей-области) — шесть проверок прокрутки, результат постоянного CSS и исходные границы проверок режимов. Это не новая регрессия текущего HEAD. Требования — [backlog](next_steps.md).
