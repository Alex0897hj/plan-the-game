# Database Schema

**Database:** PostgreSQL  
**ORM:** Prisma

---

## Enums

### `GameStatus`
| Value | Description |
|-------|-------------|
| `upcoming` | Game is scheduled and open |
| `cancelled` | Game was cancelled |
| `completed` | Game has taken place |

### `ParticipantStatus`
| Value | Description |
|-------|-------------|
| `confirmed` | User confirmed participation |
| `thinking` | User is considering participation |

---

## Models

### `User`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `Int` | PK, auto-increment |
| `email` | `String` | Unique |
| `password` | `String` | Hashed |
| `name` | `String` | Unique |
| `isAdmin` | `Boolean` | Default: `false` |
| `createdAt` | `DateTime` | Default: now |

**Relations:**
- Has many `RefreshToken`
- Has many `Game` (as creator)
- Has many `GameParticipant`

---

### `RefreshToken`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `Int` | PK, auto-increment |
| `token` | `String` | Unique |
| `userId` | `Int` | FK → `User.id` |
| `expiresAt` | `DateTime` | |
| `createdAt` | `DateTime` | Default: now |

**Relations:**
- Belongs to `User` (cascade delete)

---

### `Game`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `Int` | PK, auto-increment |
| `title` | `String` | |
| `description` | `String` | |
| `city` | `String` | |
| `gameDateTime` | `DateTime` | |
| `minPlayers` | `Int` | |
| `latitude` | `Float?` | Optional |
| `longitude` | `Float?` | Optional |
| `address` | `String?` | Optional |
| `createdById` | `Int` | FK → `User.id` |
| `status` | `GameStatus` | Default: `upcoming` |
| `createdAt` | `DateTime` | Default: now |
| `updatedAt` | `DateTime` | Auto-updated |

**Relations:**
- Belongs to `User` via `createdById`
- Has many `GameParticipant`

**Indexes:** `createdById`, `status`, `gameDateTime`

---

### `GameParticipant`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `Int` | PK, auto-increment |
| `gameId` | `Int` | FK → `Game.id` |
| `userId` | `Int` | FK → `User.id` |
| `status` | `ParticipantStatus` | Default: `confirmed` |
| `createdAt` | `DateTime` | Default: now |

**Relations:**
- Belongs to `Game` (cascade delete)
- Belongs to `User` (cascade delete)

**Indexes:** `userId`  
**Unique constraint:** `(gameId, userId)` — a user can only join a game once

---

## Entity Relationship Diagram

```
User ──────────────< RefreshToken
 │
 ├──────────────< Game
 │                    │
 └──────────────< GameParticipant >──── Game
```

- One `User` creates many `Games`
- One `Game` has many `GameParticipants`
- One `User` can be a participant in many `Games`
- A `User` can only have one `GameParticipant` record per `Game`
