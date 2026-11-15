# Aldi

Веб-приложение для женщин после родов: разговор с помощницей, карточка для врача, раздел упражнений с 3D.

- `backend/` — API (Next.js, PostgreSQL, Prisma). Запуск и деплой: `backend/README.md`.
- `docs/TECH_PLAN.md` — технический план.
- `docs/API_CONTRACTS.md` — контракты API; `docs/API_CONTRACTS_CORE.md` — три основных маршрута.
- `frontend/` — интерфейс пациентки (Lovable, TanStack Start). Копия из `BLESSING-F/design-continuation-studio`; к API пока не подключён.

Все демоданные вымышлены.

## Запуск локально

Нужны три терминала.

```bash
# 1. База
cd backend && npm install && npm run db:dev

# 2. Бэкенд (один раз перед первым запуском: cp .env.example .env и вписать ключи)
cd backend && npx prisma migrate deploy && npm run seed && npm run build && npx next start -p 3000

# 3. Фронт
cd frontend && npm install && npx vite dev --port 8080
```

Открыть http://localhost:8080. Демо-логины: `mama.demo` (пациентка) и `doctor.demo` (врач), пароль `aldi-demo-2026`.

Фронт в разработке обращается к бэкенду через `/api` на своём же адресе (прокси в `frontend/vite.config.ts`), поэтому вход работает без настройки CORS.
