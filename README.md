# Портал Правительства — Majestic RP

Многостраничный портал правительства с гражданским разделом, формами заявлений/жалоб и панелью сотрудников. Фронтенд — статические HTML/CSS/JS (GitHub Pages). Бэкенд — Node.js/Express + PostgreSQL (Railway).

## Структура проекта

```
majestic-government-portal/
├── index.html              # Главная — «Портал Правительства»
├── page2.html              # Гражданский портал (3 карточки)
├── page3.html              # Портал сотрудников / администраторов
├── application-form.html   # Форма заявления на трудоустройство
├── complaint-form.html     # Форма жалобы на сотрудника
├── css/styles.css
├── js/
│   ├── config.js           # URL API и режим fallback
│   ├── api.js              # REST-клиент
│   ├── auth.js             # MVP-аутентификация по ФИО
│   ├── hierarchy.js        # Иерархия министерств
│   └── staff-page.js       # Логика page3
└── server/                 # API + PostgreSQL
    ├── server.js
    ├── migrate.js
    ├── migrations/001_initial.sql
    └── routes/
```

## Страницы и навигация

| Страница | Описание |
|----------|----------|
| `index.html` | Заголовок «Портал Правительства», кнопка «Вход» → page2, ссылка «Вход для сотрудников» → page3 |
| `page2.html` | Три карточки: состав правительства, заявление, жалоба |
| `page3.html` | Вход по ФИО, иерархия, жалобы, заявления, кадровый аудит, логи |

## Роли

### Администрация сайта (управление порталом)
| ФИО | Роль | Доступ |
|-----|------|--------|
| Иван Петров | super_admin (гл. админ) | Всё + «Управление сайтом» |
| Сергей Админов | site_admin | Жалобы, заявления, логи, иерархия |

### Игровые роли (Majestic RP)
| ФИО | Роль | Доступ |
|-----|------|--------|
| Иван Петров | governor | + кадровый аудит |
| Мария Сидорова | hr_auditor | Жалобы, заявления, аудит |
| Алексей Козлов | minister | Жалобы, заявления |
| Другие ФИО | employee | Только иерархия |

## API (готово к Railway)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET/PUT | `/api/settings` | Настройки сайта (состав, статусы) |
| POST | `/api/applications` | Создание заявления |
| GET | `/api/applications` | Список заявлений |
| PATCH | `/api/applications/:id` | Обновление статуса |
| POST | `/api/complaints` | Создание жалобы |
| GET | `/api/complaints` | Список жалоб |
| PATCH | `/api/complaints/:id` | Обновление статуса |
| GET | `/api/logs` | Логи (администрация сайта) |
| POST | `/api/roles` | Назначение роли (кадровый аудит) |

## Локальный запуск (UI-демо без БД)

1. Откройте `index.html` через локальный сервер или напрямую в браузере.
2. В `js/config.js` установите `USE_LOCAL_FALLBACK: true` — данные сохранятся в `localStorage` для демонстрации UI.

## Развёртывание на Railway (API + PostgreSQL)

### 1. PostgreSQL в Railway

1. Создайте проект на [Railway](https://railway.app).
2. Добавьте сервис **PostgreSQL**.
3. Скопируйте переменную `DATABASE_URL` из настроек сервиса.

### 2. API-сервер на Railway

1. Добавьте сервис **Node.js** (или деплой из GitHub, корень — папка `server/`).
2. В Variables окружения задайте:
   - `DATABASE_URL` — строка подключения PostgreSQL
   - `CORS_ORIGINS` — URL вашего GitHub Pages, например `https://username.github.io`
3. Start command: `npm start`
4. После деплоя выполните миграции (Railway Shell или одноразовый deploy hook):

```bash
cd server
npm install
npm run migrate
npm start
```

### 3. Локальный запуск API с Railway БД

```bash
cd server
cp .env.example .env
# Вставьте DATABASE_URL из Railway
npm install
npm run migrate
npm start
```

Проверка: `GET http://localhost:3000/health` → `{ "status": "ok", "database": "connected" }`

## Развёртывание фронтенда на GitHub Pages

1. Создайте репозиторий на GitHub и загрузите проект.
2. Settings → Pages → Source: **Deploy from branch** → `main` / `/ (root)`.
3. Перед публикацией укажите URL API. Добавьте в `<head>` каждой HTML-страницы с формами/API **или** создайте `js/config.override.js`:

```html
<script>
  window.API_BASE_URL = "https://your-app.railway.app";
  window.USE_LOCAL_FALLBACK = false;
</script>
<script src="js/config.js"></script>
```

4. Убедитесь, что `CORS_ORIGINS` на сервере включает ваш GitHub Pages URL.

## Схема подключения к БД

```
Браузер (GitHub Pages)
    │  fetch POST/GET /api/*
    ▼
Express API (Railway)
    │  pg.Pool + DATABASE_URL
    ▼
PostgreSQL (Railway)
```

БД подключается **на этапе развёртывания** через `DATABASE_URL`. Локальное хранение в браузере используется только как fallback для UI-демо (`USE_LOCAL_FALLBACK: true`).

## Модели данных (PostgreSQL)

- `users`, `roles`, `ministries`, `user_roles`
- `applications` — id, applicant_name, position, experience, contact, notes, status, created_at
- `complaints` — id, complainant_name, target_employee, incident_date, description, contact, status, created_at
- `logs` — id, message, actor, action, metadata, created_at

## Будущие улучшения

- Серверная JWT/OAuth аутентификация
- RBAC на уровне API и БД
- Редактирование иерархии министерств
- Автоматические бэкапы Railway

## Лицензия

Проект для Majestic RP. Свободное использование в рамках сообщества.
