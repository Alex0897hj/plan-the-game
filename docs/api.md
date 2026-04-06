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
| 409         | Конфликт (например, уже участвует)         |
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

---

### GET /auth/me

**Описание:** Получение данных текущего авторизованного пользователя.

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

**Описание:** Список игр со статусом `upcoming` или `completed`. Авторизация опциональна — с токеном возвращается `myStatus`.

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
    "confirmedCount": 4,
    "waitlistCount": 2,
    "myStatus": "confirmed | waitlist | null"
  }
]
```

---

### POST /games

**Описание:** Создание новой игры. Требует авторизацию. Создатель автоматически добавляется в основной состав.

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

**Response 201:** Объект созданной игры.

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 400 `VALIDATION_ERROR` | Обязательное поле отсутствует или некорректно; `latitude`/`longitude` обязательны |
| 401 `UNAUTHORIZED` | Не авторизован |

---

### GET /games/:id

**Описание:** Детальная информация об игре, включая списки участников и waitlist.

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
  "confirmedCount": 4,
  "waitlistCount": 2,
  "confirmedList": [{ "id": 1, "email": "string", "name": "string" }],
  "waitlist":      [{ "id": 2, "email": "string", "name": "string" }],
  "myStatus": "confirmed | waitlist | null"
}
```

`waitlist` отсортирован по `createdAt ASC` — порядок отражает приоритет в очереди.

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 400 `VALIDATION_ERROR` | Некорректный id |
| 404 `NOT_FOUND` | Игра не найдена |

---

### PATCH /games/:id

**Описание:** Отмена игры создателем. Только `status: "cancelled"` допустимо.

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
| 400 `VALIDATION_ERROR` | `status` не равен `cancelled` |
| 401 `UNAUTHORIZED` | Не авторизован |
| 403 `FORBIDDEN` | Не является создателем |
| 404 `NOT_FOUND` | Игра не найдена |
| 409 `CONFLICT` | Игра не в статусе `upcoming` |

---

### POST /games/:id/participate

**Описание:** Присоединиться к игре. Тело запроса не нужно.

- Если `confirmedCount < minPlayers` → попадает в основной состав (`isWaitlist = false`)
- Иначе → попадает в waitlist (`isWaitlist = true`)
- Создатель не может вызвать этот эндпоинт (уже в составе)

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 201:**
```json
{
  "id": 1,
  "gameId": 1,
  "userId": 2,
  "isWaitlist": false,
  "createdAt": "string"
}
```

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 401 `UNAUTHORIZED` | Не авторизован |
| 403 `FORBIDDEN` | Создатель уже является участником |
| 404 `NOT_FOUND` | Игра не найдена |
| 409 `CONFLICT` | Игра не в статусе `upcoming` |
| 409 `ALREADY_JOINED` | Уже участвует в этой игре |

---

### DELETE /games/:id/participate

**Описание:** Покинуть игру или выйти из waitlist.

- Если пользователь в **основном составе**: удаляется, первый в waitlist (`createdAt ASC`) автоматически становится участником (FIFO-промоушен)
- Если пользователь в **waitlist**: просто удаляется из очереди
- Создатель не может покинуть свою игру

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 204:** Тело ответа отсутствует.

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 401 `UNAUTHORIZED` | Не авторизован |
| 403 `FORBIDDEN` | Создатель не может покинуть игру |
| 404 `NOT_FOUND` | Игра не найдена или пользователь не участвует |

---

## Cron

### GET /cron/games/auto-cancel

**Описание:** Автоматически отменяет предстоящие игры, которые начнутся менее чем через 6 часов и не набрали `minPlayers` участников в основном составе. Вызывается внешним планировщиком (например, Vercel Cron).

Если задана переменная окружения `CRON_SECRET`, эндпоинт требует заголовок `Authorization: Bearer <CRON_SECRET>`.

**Response 200:**
```json
{
  "cancelled": 2,
  "ids": [3, 7]
}
```

---

## Администрирование

Все эндпоинты требуют `isAdmin = true`. Обычные пользователи получают `403 FORBIDDEN`.

### GET /admin/users

**Описание:** Список всех пользователей.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
[
  {
    "id": 1,
    "email": "string",
    "name": "string",
    "isAdmin": false,
    "isBlocked": false,
    "canCreateGame": true,
    "createdAt": "string"
  }
]
```

---

### PATCH /admin/users/:id

**Описание:** Изменение пользователя. Нельзя изменять другого администратора.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request (все поля опциональны):**
```json
{
  "isBlocked": true,
  "canCreateGame": false,
  "email": "new@example.com",
  "name": "NewName"
}
```

**Response 200:** Обновлённый объект пользователя.

**Ошибки:**
| Код | Описание |
| --- | -------- |
| 400 `VALIDATION_ERROR` | Некорректный email / имя / нет полей |
| 403 `FORBIDDEN` | Не администратор или попытка изменить другого admin |
| 404 `NOT_FOUND` | Пользователь не найден |
| 409 `EMAIL_ALREADY_EXISTS` / `NAME_ALREADY_EXISTS` | Уже занято |
