# Cafe Orders

Веб-приложение для управления заказами в кафе во время рабочей смены: кассир принимает заказы, бариста меняет их статусы в реальном времени, по окончании смены формируется отчёт с чеком (PNG). Чек автоматически отправляется в Telegram-чат кафе каждый вечер.

## Возможности

- Две роли с раздельными интерфейсами: **Кассир** (синяя тема) и **Бариста** (зелёная)
- Реал-тайм синхронизация заказов и меню между всеми устройствами через Socket.io
- Очереди баристы: **Новые / Готовится / Готово** — статус меняется одним тапом
- Управление меню с категориями (основное меню / сезонные напитки / десерты)
- Автокомплит имени клиента по истории заказов
- Отчёт за смену: количество заказов, позиций, выручка, топ-позиции, список клиентов
- Серверная генерация чека в PNG (`@napi-rs/canvas`) с иконкой монеты
- Автоотправка чека смены в Telegram-чат кафе в 23:55 МСК (защита от двойной отправки)
- Telegram Mini App с fullscreen и учётом safe-area
- Устойчивость к разрывам соединения: Socket.io переподключается, данные перезагружаются автоматически
- Подтверждённая отправка заказа (callback от сервера) — исключает потерю и дублирование

## Стек

| Слой | Технология |
|---|---|
| Бэкенд | Node.js 20, Express 4, Socket.io 4 |
| Фронтенд | React 18, Vite 6, React Router 6 |
| База данных | SQLite через [libsql](https://github.com/tursodatabase/libsql) — локальный файл или [Turso](https://turso.tech) |
| Telegram-бот | [grammY](https://grammy.dev) |
| Генерация чека | [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) (сервер), html2canvas (клиент) |
| Контейнер / хостинг | Docker, [Fly.io](https://fly.io) (`fly.toml` в репо) |

## Структура проекта

```
cafe-orders/
├── server/
│   ├── index.js          # Express + Socket.io, обработчики событий
│   ├── db.js             # libsql-клиент, схема, миграции, CRUD
│   ├── bot.js            # Telegram-бот (grammY), отключается без BOT_TOKEN
│   ├── scheduler.js      # Автоотправка отчёта в 23:55 МСК
│   └── receiptImage.js   # Серверный рендер чека в PNG (@napi-rs/canvas)
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── constants.js              # CATEGORIES
│   │   ├── pages/
│   │   │   ├── RoleSelectPage.jsx    # Выбор роли, запоминает в localStorage
│   │   │   ├── CashierPage.jsx       # Интерфейс кассира
│   │   │   ├── BaristaPage.jsx       # Три очереди заказов
│   │   │   └── ShiftReportPage.jsx   # Сводка смены + чек
│   │   ├── components/
│   │   │   ├── Modal.jsx             # Центрированный диалог
│   │   │   ├── OrderForm.jsx         # Форма нового / редактируемого заказа
│   │   │   ├── OrderCard.jsx         # Карточка заказа (бариста)
│   │   │   ├── OrderList.jsx         # Список заказов (кассир)
│   │   │   ├── MenuManager.jsx       # CRUD меню в модале
│   │   │   ├── ShiftReport.jsx       # Сводка смены
│   │   │   ├── ReceiptPreview.jsx    # Предпросмотр чека, скачивание / отправка в TG
│   │   │   └── Coin.jsx              # SVG иконка монеты
│   │   ├── hooks/
│   │   │   └── useSocket.js          # Socket.io клиент + статус подключения
│   │   └── styles/app.css
│   ├── vite.config.js                # Прокси /socket.io → :3000
│   └── package.json
├── Dockerfile
├── fly.toml                          # Конфиг Fly.io (region ams, volume cafe_data)
├── package.json
└── .env example
```

## Переменные окружения

Создай файл `.env` в корне проекта (см. `.env example`):

```env
# Telegram-бот (опционально — без токена бот выключен, всё остальное работает)
BOT_TOKEN=
CAFE_CHAT_ID=       # chat_id куда отправлять чек смены (узнать через /id в боте)
APP_URL=            # URL приложения, ставится в кнопку Mini App

# Сервер
PORT=3000
NODE_ENV=development

# База данных (опционально)
# Если не задано — используется локальный файл cafe.db (или DATABASE_PATH)
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
DATABASE_PATH=cafe.db
```

В `development` режиме бот **всегда выключен** (см. `server/bot.js`), даже если токен задан.

## Локальный запуск

```bash
# 1. Установить зависимости (корень + client)
npm run install:all

# 2. Создать .env (можно с пустыми значениями для бота)

# 3. Запустить сервер и клиент одновременно
npm run dev
```

- Клиент: <http://localhost:5173> (Vite, прокси WebSocket → :3000)
- Сервер: <http://localhost:3000>
- БД: создаётся файл `cafe.db` в корне при первом запуске

Запустить только сервер: `npm run server`. Только клиент: `npm run client`.

## Деплой

### Fly.io (конфиг уже в репо)

```bash
fly launch --no-deploy   # один раз, чтобы создать app/volume
fly secrets set BOT_TOKEN=... CAFE_CHAT_ID=... APP_URL=https://<app>.fly.dev
fly deploy
```

`fly.toml` уже настроен: регион `ams`, volume `cafe_data` примонтирован в `/data`, `DATABASE_PATH=/data/cafe.db` — SQLite-файл переживает рестарты.

### Любой хостинг с Docker

```bash
docker build -t cafe-orders .
docker run -p 3000:3000 --env-file .env cafe-orders
```

Dockerfile собирает клиент (`vite build` → `client/dist`) и затем сервер раздаёт статику и API с одного порта.

### Render / Railway / VPS

Используй тот же `Dockerfile`. Для постоянного хранилища либо подключай volume и задай `DATABASE_PATH`, либо переходи на Turso (`TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`) — код выбирает источник автоматически.

## Telegram Mini App

- Команда `/start` сохраняет пользователя в `bot_users` и присылает кнопку «Открыть приложение» (web app по `APP_URL`)
- Команда `/id` присылает `chat_id` текущего чата — используй её, чтобы получить `CAFE_CHAT_ID`
- В клиенте автоматически вызывается `expand()` и `requestFullscreen()` (Telegram 8.0+). Для безусловного fullscreen — включи его в **@BotFather → Bot Settings → Menu Button → Allow Fullscreen**
- Учёт safe-area: `env(safe-area-inset-top)` и `--tg-safe-area-inset-top`

## Автоотправка чека смены

`server/scheduler.js` запускается при старте, если заданы `BOT_TOKEN` и `CAFE_CHAT_ID`.

- Слот: **23:55 МСК** ежедневно
- Если за день не было заказов — отправка пропускается
- Защита от повтора: таблица `shift_reports_sent` (`shift_date + slot`)
- Чек рендерится через `receiptImage.js` (PNG, монохромный, с иконкой монеты у сумм)

## Архитектура: Socket.io события

Все взаимодействия клиент↔сервер идут через сокеты (HTTP — только статика + `/socket.io`):

| Событие | Направление | Назначение |
|---|---|---|
| `orders:load` / `orders:list` | C→S / S→C | Загрузить заказы текущей смены |
| `order:create` | C→S (с callback) | Создать заказ; ответ `{ok}` для разблокировки кнопки |
| `order:edit` / `order:delete` | C→S | Редактирование и удаление |
| `order:update` | C→S | Сменить статус (бариста) |
| `order:new` / `order:updated` / `order:deleted` | S→C (broadcast) | Изменения транслируются всем |
| `menu:load` / `menu:list` / `menu:add` / `menu:update` / `menu:delete` / `menu:changed` | C↔S | CRUD меню |
| `shift:report` / `shift:report_data` | C↔S | Получить отчёт за дату |
| `customers:search` | C→S (с callback) | Автокомплит имён по истории |
| `receipt:send` | C→S (с callback) | Отправить PNG чека в Telegram-чат |
| `bot:users` | C→S (с callback) | Список зарегистрированных пользователей бота |

## Схема БД

- **`menu_items`** — `id, name, price, available, category` (`coffee` / `seasonal` / `dessert`). Удаление — мягкое (`available = 0`).
- **`orders`** — `id, customer_name, notes, status, created_at, shift_date`. Статусы: `pending`, `in_progress`, `done`.
- **`order_items`** — `id, order_id, menu_item_id, quantity` (заказ ↔ позиции).
- **`bot_users`** — `chat_id, username, first_name, last_name, updated_at`.
- **`shift_reports_sent`** — `shift_date, slot, sent_at` (защита от повторной автоотправки).

`db.js` при старте идемпотентно создаёт таблицы и выполняет миграцию: если в `orders` остался legacy-столбец `menu_item_id`, данные переезжают в `order_items` через batch-операцию с обходом ограничений FK на Turso HTTP.

## Сценарий смены

1. Открыть приложение, выбрать роль **Кассир** (роль сохранится в `localStorage`)
2. Нажать **Меню** → добавить напитки и десерты в модальном окне
3. Принимать заказы через форму (кнопка блокируется до подтверждения сервера)
4. Бариста на своём устройстве выбирает роль **Бариста**, обновляет статусы заказов в очередях
5. По окончании смены кассир открывает **Отчёт** → **Чек** → скачивает PNG или отправляет в Telegram-чат
6. В 23:55 МСК сервер сам отправляет чек смены в `CAFE_CHAT_ID`
