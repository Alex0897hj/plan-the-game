# API Reference — Plan the Game

Единый источник правды для frontend и backend.  
Base URL: `/api`

---

## Формат ошибок

Все ошибки возвращаются в едином формате:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message"
}
```

| HTTP-статус | Когда используется                         |
| ----------- | ------------------------------------------ |
| 400         | Ошибка валидации, некорректный запрос      |
| 401         | Не авторизован, токен истёк или невалиден  |
| 403         | Нет прав на действие                       |
| 404         | Ресурс не найден                           |
| 409         | Конфликт (например, email уже занят)       |
| 500         | Внутренняя ошибка сервера                  |

---

## Аутентификация

### POST /auth/register

**Описание:** Создание нового пользователя. После успешной регистрации возвращает токены — пользователь сразу считается авторизованным.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response 201:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 400 `VALIDATION_ERROR` | Email некорректный или пароль пустой / слишком короткий |
| 409 `EMAIL_ALREADY_EXISTS` | Пользователь с таким email уже зарегистрирован |

**Использование на фронте:** После успешного ответа сохранить `access_token` в `localStorage`, сохранить `refresh_token` в `localStorage`, перенаправить пользователя в приложение.

---

### POST /auth/login

**Описание:** Вход существующего пользователя по email и паролю. Возвращает пару токенов.

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response 200:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": 1,
    "email": "user@example.com"
  }
}
```

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 400 `VALIDATION_ERROR` | Email некорректный или пароль пустой |
| 401 `INVALID_CREDENTIALS` | Неверный email или пароль |

**Использование на фронте:** Сохранить токены, перенаправить пользователя.

---

### POST /auth/refresh

**Описание:** Обновление пары токенов по `refresh_token`. Старый refresh-токен инвалидируется — выдаётся новый.

**Request:**
```json
{
  "refresh_token": "string"
}
```

**Response 200:**
```json
{
  "access_token": "string",
  "refresh_token": "string"
}
```

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 400 `VALIDATION_ERROR` | Поле `refresh_token` отсутствует |
| 401 `INVALID_REFRESH_TOKEN` | Токен невалиден, истёк или уже использован |

**Использование на фронте:** Вызывать автоматически при получении 401 в ответ на запрос с `access_token`. После успеха повторить исходный запрос. При ошибке — разлогинить пользователя.

---

### GET /auth/me

**Описание:** Получение данных текущего авторизованного пользователя. Требует валидный `access_token` в заголовке.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "id": 1,
  "email": "user@example.com"
}
```

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 401 `MISSING_TOKEN` | Заголовок `Authorization` отсутствует |
| 401 `INVALID_TOKEN` | Токен невалиден или истёк |

**Использование на фронте:** Вызывать при инициализации приложения для проверки, авторизован ли пользователь.

---

## Токены

| Токен           | Срок жизни | Где хранить   |
| --------------- | ---------- | ------------- |
| `access_token`  | 15 минут   | `localStorage`|
| `refresh_token` | 7 дней     | `localStorage`|

`access_token` передаётся в заголовке `Authorization: Bearer <token>` при каждом защищённом запросе.

---

## Игры

### GET /games

**Описание:** Список всех игр со статусом `upcoming` или `completed` (отменённые исключены). Не требует авторизации, но если передать `access_token` — в каждом объекте будет поле `myStatus`.

**Headers (опционально):**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
[
  {
    "id": 1,
    "title": "string",
    "description": "string",
    "city": "string",
    "gameDateTime": "2026-04-10T18:00:00.000Z",
    "minPlayers": 6,
    "latitude": 55.751244,
    "longitude": 37.618423,
    "address": "string | null",
    "status": "upcoming",
    "createdAt": "string",
    "updatedAt": "string",
    "createdById": 1,
    "createdBy": { "id": 1, "email": "string", "name": "string" },
    "confirmedCount": 3,
    "thinkingCount": 1,
    "myStatus": "confirmed | thinking | null"
  }
]
```

---

### POST /games

**Описание:** Создание новой игры. Требует авторизацию. Создатель автоматически добавляется как участник со статусом `confirmed`.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "title": "string",
  "description": "string",
  "city": "string",
  "gameDateTime": "2026-04-10T18:00:00.000Z",
  "minPlayers": 6,
  "latitude": 55.751244,
  "longitude": 37.618423,
  "address": "string (optional)"
}
```

**Response 201:** Объект созданной игры (без участников).

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 400 `VALIDATION_ERROR` | Одно из обязательных полей отсутствует или некорректно; `latitude`/`longitude` обязательны |
| 401 `UNAUTHORIZED` | Не авторизован |

---

### GET /games/:id

**Описание:** Детальная информация об игре, включая списки участников. Авторизация опциональна — с токеном возвращается `myStatus`.

**Headers (опционально):**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "id": 1,
  "title": "string",
  "description": "string",
  "city": "string",
  "gameDateTime": "string",
  "minPlayers": 6,
  "latitude": 55.751244,
  "longitude": 37.618423,
  "address": "string | null",
  "status": "upcoming",
  "createdAt": "string",
  "updatedAt": "string",
  "createdById": 1,
  "createdBy": { "id": 1, "email": "string", "name": "string" },
  "confirmedCount": 3,
  "thinkingCount": 1,
  "confirmedList": [{ "id": 1, "email": "string", "name": "string" }],
  "thinkingList": [{ "id": 2, "email": "string", "name": "string" }],
  "myStatus": "confirmed | thinking | null"
}
```

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 400 `VALIDATION_ERROR` | Некорректный id |
| 404 `NOT_FOUND` | Игра не найдена |

---

### PATCH /games/:id

**Описание:** Отмена игры. Только создатель может отменить; игра должна быть в статусе `upcoming`.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{ "status": "cancelled" }
```

**Response 200:** Обновлённый объект игры.

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 400 `VALIDATION_ERROR` | `status` не равен `cancelled` или некорректный id |
| 401 `UNAUTHORIZED` | Не авторизован |
| 403 `FORBIDDEN` | Текущий пользователь не является создателем |
| 404 `NOT_FOUND` | Игра не найдена |
| 409 `CONFLICT` | Игра не в статусе `upcoming` |

---

### POST /games/:id/participate

**Описание:** Присоединиться к игре или изменить статус участия. Создатель не может использовать этот эндпоинт (его статус фиксирован как `confirmed`).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{ "status": "confirmed | thinking" }
```

**Response 200:**
```json
{
  "id": 1,
  "gameId": 1,
  "userId": 2,
  "status": "confirmed",
  "createdAt": "string"
}
```

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 400 `VALIDATION_ERROR` | `status` имеет недопустимое значение или некорректный id |
| 401 `UNAUTHORIZED` | Не авторизован |
| 403 `FORBIDDEN` | Создатель пытается изменить свой статус участия |
| 404 `NOT_FOUND` | Игра не найдена |

---

### DELETE /games/:id/participate

**Описание:** Покинуть игру (удалить запись участия). Создатель не может покинуть созданную им игру.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 204:** Тело ответа отсутствует.

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 400 `VALIDATION_ERROR` | Некорректный id |
| 401 `UNAUTHORIZED` | Не авторизован |
| 403 `FORBIDDEN` | Создатель не может покинуть свою игру |
| 404 `NOT_FOUND` | Игра не найдена |
