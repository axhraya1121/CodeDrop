# Technical Requirements Document (TRD)

## Overview
Technical design for Personal File Drop — a Next.js web app with custom (non-email) username/password auth, backed by Supabase Storage and Postgres.

## Tech stack
| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (App Router) | Existing stack, fast to build |
| Backend | Next.js API routes | No separate backend service needed |
| Auth | Custom (bcrypt + JWT) | Not Supabase Auth — no email required |
| Database | Supabase Postgres | Managed via Prisma |
| ORM | Prisma | Schema + migrations |
| File storage | Supabase Storage | Per-user folder structure |
| Hosting | Vercel | Existing deployment workflow |
| Session | JWT in httpOnly cookie | XSS-resistant, no client-side token handling |

## Data model

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  files        File[]
}

model File {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  fileName    String
  storagePath String
  size        Int
  uploadedAt  DateTime @default(now())
}
```

## Auth design

### Username availability check
- Signup form debounces the username input (e.g. 400ms after last keystroke) and calls `GET /api/auth/check-username?u=<username>`
- Server does a simple `SELECT 1 FROM User WHERE username = ?` (case-insensitive match recommended, e.g. store/compare lowercased) and returns `{ available: true|false }`
- Frontend shows inline feedback under the field: green check "username available" or red "username already taken" — same pattern as Gmail's signup form
- This check is advisory only — the final signup submission still re-checks uniqueness server-side (see Signup below) to handle race conditions where two users grab the same username at nearly the same time. The DB `username` column keeps its `@unique` constraint as the actual source of truth; on a race, the second `INSERT` fails and the API returns a "username taken" error even if the earlier availability check said it was free

### Signup
1. Client sends `{ username, password }` to `POST /api/auth/signup`
2. Server checks username uniqueness (authoritative check, independent of the earlier availability check)
3. Password hashed with bcrypt (cost factor 10+)
4. User row created
5. JWT issued (`{ userId }`), set as httpOnly, secure, sameSite=strict cookie
6. Response: success + redirect to dashboard

### Login
1. Client sends `{ username, password }` to `POST /api/auth/login`
2. Server looks up user by username
3. `bcrypt.compare(password, storedHash)`
4. On match: issue JWT cookie (same as signup)
5. On failure: generic "invalid username or password" (don't reveal which field was wrong)

### Session verification (middleware)
- Every protected API route runs a `verifyAuth(req)` helper
- Reads JWT from cookie, verifies signature + expiry
- Extracts `userId`, attaches to request context
- Missing/invalid token → 401 Unauthorized

### Logout
- Clears the auth cookie

## API routes

| Method | Route | Auth required | Purpose |
|---|---|---|---|
| GET | `/api/auth/check-username?u=<username>` | No | Check if a username is already taken |
| POST | `/api/auth/signup` | No | Create account |
| POST | `/api/auth/login` | No | Authenticate, issue session |
| POST | `/api/auth/logout` | Yes | Clear session |
| GET | `/api/files` | Yes | List current user's files |
| POST | `/api/files/upload` | Yes | Upload file, create DB record |
| GET | `/api/files/:id/download` | Yes | Stream/redirect to file (ownership check) |
| DELETE | `/api/files/:id` | Yes | Delete file (ownership check + storage cleanup) |

Every file-scoped route must verify `file.userId === req.user.id` before acting — this is the sole data-isolation mechanism (no Supabase RLS since auth is custom, not Supabase Auth).

## Storage design
- Bucket: single Supabase Storage bucket, e.g. `user-files`
- Path convention: `{userId}/{fileId}-{originalFileName}`
- Bucket access: private (not public) — all reads go through the authenticated `/api/files/:id/download` route, which fetches the file server-side (using the service role key) and streams it back, rather than exposing public Supabase URLs directly
- Upload flow: file received via `multipart/form-data` (or client-side direct upload with a signed URL) → written to bucket → DB row created with `storagePath`

## Security considerations
- Passwords: bcrypt hashed, never logged or returned in any API response
- JWT secret: stored in environment variable, never committed
- Cookies: httpOnly (no JS access), secure (HTTPS only), sameSite=strict (CSRF mitigation)
- File access: always ownership-checked server-side before returning a file, regardless of what the client requests
- Rate limiting: basic rate limit on `/api/auth/login` to slow brute-force attempts (can start simple — e.g. limit by IP in middleware)
- Input validation: username/password length and character constraints enforced server-side, not just client-side

## Environment variables
```
DATABASE_URL=
JWT_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=
```

## Deployment
- Vercel for frontend + API routes
- Supabase project for Postgres + Storage
- Prisma migrations run against Supabase Postgres connection string

## Out of scope for v1 (technical)
- No Supabase Row-Level Security policies (ownership enforced entirely in API route logic instead, since auth isn't Supabase-native)
- No background jobs / cron (file expiry, if added later, would need this)
- No CDN/caching layer for downloads — direct server-streamed files only
