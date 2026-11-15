# Aldi — контракты API

Описывает бэкенд в папке `backend/` — то, что реально реализовано. Основа: `ALDI_TECH_PLAN.md`, разделы 13–14.

## Общие правила

- Все запросы и ответы — JSON по HTTPS.
- Успех: `{ "data": ... }`. Ошибка: `{ "error": { "code": "...", "message": "..." } }`.
- `code` стабилен и не зависит от языка. `message` приходит на языке пользователя (из его профиля; без входа — из заголовка `Accept-Language`).
- Языки: `ru`, `kk`, `uz`, `en`.
- Сессия хранится в HttpOnly-cookie `aldi_session`. Фронт шлёт запросы с `credentials: "include"`.
- Изменяющие запросы (`POST`, `PATCH`, `DELETE`) должны приходить с сайта из списка `CORS_ORIGINS`, иначе `403 CSRF_REJECTED`.
- Роль, пациентка и клиника определяются сервером по сессии. Поля вроде `patientId` или `role` в теле запроса отклоняются как неизвестные.
- Неизвестные поля в теле запроса → `400 INVALID_INPUT`.

### Коды ошибок

| HTTP | Коды |
|---|---|
| 400 | `INVALID_INPUT`, `UNSUPPORTED_LOCALE`, `CONSENT_REQUIRED`, `INVITATION_INVALID` |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN`, `CSRF_REJECTED` |
| 404 | `NOT_FOUND` (в том числе чужой объект) |
| 409 | `VERSION_CONFLICT`, `LOGIN_TAKEN`, `CARD_NOT_READY`, `INTAKE_CLOSED`, `EMPTY_CONVERSATION`, `TRANSCRIPT_NOT_READY` |
| 429 | `RATE_LIMITED` |
| 500 | `INTERNAL` |
| 503 | `LLM_UNAVAILABLE`, `VOICE_UNAVAILABLE` |

## Вход

| Метод и путь | Тело | Ответ `data` |
|---|---|---|
| `POST /api/auth/login` | `{ login, password }` | `{ user: { id, role, locale }, expiresAt }` + cookie |
| `POST /api/auth/logout` | — | `{ ok: true }`, сессия отозвана |
| `GET /api/auth/me` | — | см. ниже |
| `PATCH /api/auth/me` | `{ locale }` | `{ locale }` |
| `POST /api/auth/invitations/accept` | `{ token, login, password }` | как у входа; приглашение одноразовое |
| `POST /api/auth/password-reset` | `{ login }` | `{ accepted: true }` всегда |

`GET /api/auth/me`:
- пациентка: `{ user, patient: { id, displayName, clinic }, doctors: [{ id, displayName, clinic }] }` — `doctors` это те, кому можно отправить карточку;
- врач: `{ user, doctor: { id, displayName, clinic } }`.

Логин: 3–50 символов, латиница, цифры и `. _ @ -`. Пароль: от 8 символов. После 5 неверных попыток вход для логина блокируется на 15 минут (`429`).

## Врач: пациентки

| Метод и путь | Тело / параметры | Ответ `data` |
|---|---|---|
| `GET /api/doctor/patients` | `?search=&status=&page=&pageSize=` | `{ items: [patient], total, page, pageSize }` |
| `POST /api/doctor/patients` | `{ displayName, locale, contact? }` | `{ patient, invitation: { token, expiresAt } }` |
| `GET /api/doctor/patients/:id` | — | `{ patient, sharedCards: [{ intakeId, cardVersion, sharedAt, reviewedAt, urgent }] }` |
| `PATCH /api/doctor/patients/:id` | `{ displayName?, contact?, locale? }` | `{ patient }` |
| `POST /api/doctor/patients/:id/invitations` | — | `{ invitation: { token, expiresAt } }`, старое отозвано |

`patient` = `{ id, displayName, locale, contact, status, createdAt }`, `status`: `INVITED | ACTIVE | ARCHIVED`.

Токен приглашения показывается один раз. Фронт строит из него ссылку (например, `/invite?token=...`), врач передаёт её пациентке. Приглашение действует 72 часа.

## Пациентка: разговор и карточка

| Метод и путь | Тело | Ответ `data` |
|---|---|---|
| `POST /api/intakes` | `{ locale, consentVersion, consent: true, country? }` | `{ id, status: "IN_PROGRESS" }` |
| `GET /api/intakes` | — | `{ items: [{ id, status, processingStatus, urgent, version, locale, createdAt }] }` |
| `GET /api/intakes/:id` | — | разговор целиком, см. ниже |
| `POST /api/intakes/:id/messages` | `{ message, clientMessageId }` | `{ message, assistantMessage, urgent, urgentReason }` |
| `POST /api/voice/session` | `{ intakeId }` | `{ sessionUrl, dynamicVariables: { intake_id, session_token, locale } }` |
| `POST /api/intakes/:id/complete` | `{ expectedVersion: 0, conversationId? }` | `{ status, processingStatus, urgent, urgentReason, card }` |
| `PATCH /api/intakes/:id/card` | `{ expectedVersion, changes: { fields?, doctorQuestions? } }` | `{ card }` |
| `POST /api/intakes/:id/share` | `{ cardVersion, doctorId, consent: true }` | `{ shareId, status: "SHARED", cardVersion, notification }` |
| `POST /api/intakes/:id/translations` | `{ targetLocale }` | перевод, см. ниже |
| `DELETE /api/intakes/:id` | — | `{ deleted: true, exceptions }` |

`GET /api/intakes/:id`:

```json
{
  "id": "…", "status": "READY", "processingStatus": "DONE",
  "urgent": false, "urgentReason": null,
  "locale": "ru", "country": "KZ", "version": 1, "createdAt": "…",
  "messages": [{ "id": "…", "role": "patient", "text": "…", "language": "ru" }],
  "card": {
    "version": 1, "sourceLocale": "ru",
    "fields": { "complaint": { "value": "…", "quote": "…", "quoteVerified": true, "editedByPatient": false } },
    "doctorQuestions": ["…"]
  },
  "preview": {},
  "shares": [{ "shareId": "…", "doctorId": "…", "doctorName": "…", "cardVersion": 1, "sharedAt": "…", "reviewedAt": null }]
}
```

Поля карточки: `time_since_birth`, `birth_info`, `complaint`, `triggers`, `frequency`, `impact`, `tried_or_told`, `own_question`.

Что важно для интерфейса:

- **Статус:** `IN_PROGRESS → READY → SHARED → REVIEWED`. Обработка отдельно: `IDLE | PROCESSING | FAILED | DONE`.
- **Срочность — отдельный признак** `urgent`, статус он не меняет. При `urgent: true` фронт показывает согласованную инструкцию экстренной помощи для страны `country` и не предлагает упражнения.
- **Нет данных:** `value: null` → «Не указано».
- **Цитата не подтверждена:** `quoteVerified: false` при непустой цитате → «Проверьте».
- **Исправлено пациенткой:** `editedByPatient: true` → пометка «изменено»; такая строка не считается подтверждённой цитатой.
- **Сообщения:** `clientMessageId` — случайная строка от фронта. Повтор с тем же значением не создаёт вторую реплику.
- **Создание разговора:** заголовок `Idempotency-Key` защищает от дублей при повторе запроса.
- **Завершение текстового разговора:** `{ expectedVersion: 0 }`.
- **Завершение голосового:** добавить `conversationId` из ElevenLabs. Транскрипт сервер забирает у провайдера сам; текст от фронта не принимается.
- **`TRANSCRIPT_NOT_READY`:** провайдер ещё не обработал запись, повторить через несколько секунд.
- **`LLM_UNAVAILABLE` при завершении:** разговор сохранён, показать «Повторить».
- **Правка карточки:** `changes.fields` — объект `{ ключ: новый текст | null }`. Каждая правка создаёт новую версию. При устаревшем `expectedVersion` — `409 VERSION_CONFLICT`.
- **Отправка:** `cardVersion` должен быть текущим, `doctorId` — из `me.doctors`. Повтор той же отправки возвращает тот же `shareId`.
- **Правка после отправки:** врач продолжает видеть отправленную версию. Чтобы он увидел новую, нужна новая отправка с новым согласием.
- **Живое превью:** `preview` заполняется во время голосового разговора инструментом агента; на готовую карточку не влияет.

Перевод (`POST …/translations`): `{ cardVersion, sourceLocale, locale, machineTranslated: true, fields: { ключ: { value, quoteTranslation } }, doctorQuestions }`. Оригинальные цитаты остаются в карточке; перевод показывать рядом с пометкой «Перевод». Доступен владелице и врачу, которому карточка отправлена.

## Врач: отправленные карточки

| Метод и путь | Тело / параметры | Ответ `data` |
|---|---|---|
| `GET /api/doctor/intakes` | `?page=&pageSize=` | `{ items, total, page, pageSize }` |
| `GET /api/doctor/intakes/:id` | — | карточка, см. ниже |
| `PATCH /api/doctor/intakes/:id` | `{ reviewed: true }` | та же карточка со `status: "REVIEWED"` |

Элемент списка: `{ intakeId, shareId, cardVersion, sharedAt, status, urgent, patient: { id, displayName }, summary }`. Срочные идут первыми, дальше новые.

Карточка: `{ intakeId, shareId, sharedAt, status, reviewedAt, urgent, urgentReason, locale, patient, card, newerDraftExists }`. Транскрипт разговора врачу не отдаётся. `newerDraftExists: true` — пациентка исправила карточку после отправки, но новую версию не отправляла.

## Упражнения

Каталог — три упражнения из репозитория 3D (`moonicer/aldi-exercises`), загружены в базу сидом из `backend/prisma/exercises.json`. 3D-сцены процедурные и рисуются во фронте; файлов моделей нет.

| Метод и путь | Ответ `data` |
|---|---|
| `GET /api/exercises?locale=ru` | `{ items: [exercise] }` |
| `GET /api/exercises/:id?locale=ru` | `exercise` |

```json
{
  "id": "pf-slow", "locale": "ru", "durationSec": 80,
  "visual": "hammock", "locked": false, "has3d": true,
  "modelUrl": null, "animationName": null,
  "available": true, "availableLocales": ["en", "kk", "ru", "uz"],
  "title": "…", "description": "…", "steps": ["…"],
  "cues": [{ "atSec": 0, "phase": "inhale", "text": "Вдох" }],
  "machineTranslated": true, "unlockNote": null,
  "audioUrl": null, "contraindications": null, "reviewed": false
}
```

- `id`: `pf-slow`, `pelvic-tilt`, `bridge`.
- `visual`: какую сцену рисует плеер — `hammock` или `mannequin`.
- `locked: true` — упражнение закрыто; `unlockNote` объясняет, как его открыть.
- `cues`: подсказки дыхания. `phase`: `inhale | squeeze | hold | release | rest`. Время и фазы одинаковы на всех языках, отличается только `text`.
- `machineTranslated: true` — черновик машинного перевода (ru, en, uz); казахский написан носителем.
- `reviewed: false` — демонстрационный пример, не проверенный специалистом; показывать с этой пометкой.
- `available: false` — текста на этом языке нет. Текстовые поля пустые; фронт предлагает язык из `availableLocales`, а не подставляет его молча.

Поля `steps`, `cues`, `machineTranslated`, `unlockNote`, `visual`, `locked`, `durationSec` называются так же, как в `entities/exercise/types.ts` плеера. Чтобы плеер брал данные с сервера, вместо чтения `exercises.json` ему нужен запрос `GET /api/exercises/:id?locale=…`.

## Инструменты голосового агента

Вызывает только ElevenLabs. Заголовок `X-Tool-Secret` = `TOOL_SECRET`.

| Метод и путь | Тело |
|---|---|
| `POST /api/tools/update-intake` | `{ intake_id, session_token, field, value, quote }` |
| `POST /api/tools/flag-urgent` | `{ intake_id, session_token, reason }` |

`intake_id` и `session_token` агент получает как dynamic variables: фронт передаёт их в `startSession` из ответа `POST /api/voice/session`.
