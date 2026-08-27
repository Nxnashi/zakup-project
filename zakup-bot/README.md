# Закуп-бот — заявки на закуп (Telegram Mini App)

Флоу: повар создаёт заявку → шеф/су-шеф утверждает (может править кол-во) →
закупщик видит утверждённое консолидированно по всем цехам и по каждому цеху
отдельно → отмечает «заказано» / «получено».

## Структура

```
backend/    FastAPI + SQLAlchemy (API) + aiogram (бот, открывает Mini App)
frontend/   React + Vite (сам Mini App)
```

Номенклатура (467 позиций, 5 категорий) и тестовые пользователи (3 цеха:
горячий/холодный/бар, 2 согласующих, 1 закупщик) уже зашиты в
`backend/app/data/*.json` и подгружаются автоматически при первом старте.

## Локальный запуск

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010
```

При первом старте база (`zakup.db`, SQLite) создаётся и заполняется сама.
Проверить: http://localhost:8010/health

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Откроется на http://localhost:5173, ходит в API на http://localhost:8010
(меняется через `.env` → `VITE_API_URL`).

### Бот (опционально для локальной разработки)

```bash
cd backend
BOT_TOKEN=xxx FRONTEND_URL=https://<адрес фронта> python bot.py
```

## Важно — что доделать перед реальным запуском

1. **Авторизация через Telegram.** Сейчас в `frontend/src/App.jsx` стоит
   временный экран выбора пользователя (для разработки). В проде нужно:
   - на фронте брать `window.Telegram.WebApp.initDataUnsafe.user`
   - слать `initData` на бэкенд, там проверять подпись секретом бота
     (`BOT_TOKEN`) и сопоставлять `telegram_id` с таблицей `users`
   - если юзера нет в базе — показывать «обратитесь к администратору»
2. **Реальные Telegram-юзернеймы** — сейчас в `backend/app/data/users.json`
   стоят вымышленные ФИО, замени на настоящих людей (username без @).
3. **Поставщики для позиций бара** — в `backend/app/data/products.json`
   у категории «Бар» поставщик не проставлен (`null`), надо решить, у каких
   дистрибьюторов закупаете алкоголь и миксеры.
4. **iiko-синхронизация** (не в MVP) — сейчас номенклатура статична, при
   желании можно позже подключить обновление остатков/номенклатуры из iiko.

## Деплой на Railway

1. Создай новый проект на Railway, добавь два сервиса из этого репо:
   - `backend` (root directory `backend`, start command
     `uvicorn app.main:app --host 0.0.0.0 --port $PORT`)
   - `frontend` (root directory `frontend`, build command `npm run build`,
     start command можно через `serve -s dist -l $PORT`, либо раздавать
     статику самим FastAPI — на ваш выбор)
2. Для продакшена замени SQLite на Postgres: добавь Postgres-плагин в
   Railway и пропиши `DATABASE_URL` в переменных окружения backend-сервиса
   (формат подхватится автоматически, `sqlalchemy` уже поддерживает).
3. В переменных backend пропиши `BOT_TOKEN` (токен от @BotFather).
4. В переменных frontend пропиши `VITE_API_URL` = публичный адрес
   backend-сервиса.
5. Заведи бота через @BotFather, включи Mini App (`/newapp` или через
   `/mybots` → Bot Settings → Menu Button), укажи URL фронтенда.
6. Запусти `bot.py` как отдельный процесс/сервис (worker) на Railway с
   `FRONTEND_URL` = адрес фронта.
