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

---

## Models

### `User`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `Int` | PK, auto-increment |
| `email` | `String` | Unique |
| `password` | `String` | Hashed |
| `name` | `String` | Unique |
| `isAdmin` | `Boolean` | Default: `false` — superadmin flag |
| `isBlocked` | `Boolean` | Default: `false` — blocked users cannot login |
| `canCreateGame` | `Boolean` | Default: `true` — if `false`, POST /games is forbidden |
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
| `minPlayers` | `Int` | Minimum to start the game |
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
| `isWaitlist` | `Boolean` | Default: `false`. `true` = waitlist, `false` = main roster |
| `createdAt` | `DateTime` | Default: now |

**Relations:**
- Belongs to `Game` (cascade delete)
- Belongs to `User` (cascade delete)

**Indexes:** `userId`, `(gameId, isWaitlist)`  
**Unique constraint:** `(gameId, userId)` — a user can only have one record per game

**Participant logic:**
- First `minPlayers` participants get `isWaitlist = false` (main roster)
- Subsequent participants get `isWaitlist = true` (waitlist, FIFO order)
- When a main-roster participant leaves, the first waitlist member (`createdAt ASC`) is automatically promoted to `isWaitlist = false`
- If a game has fewer main-roster participants than `minPlayers` at 6 hours before `gameDateTime`, it is auto-cancelled

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
