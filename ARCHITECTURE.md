# Architecture Overview

Athenaeum is a family household management platform combining calendar synchronization with chore tracking and gamification. Designed for wall-mounted Raspberry Pi displays.

## Tech Stack

| Layer         | Technology                     |
| ------------- | ------------------------------ |
| Framework     | Next.js 16 (App Router)        |
| UI            | React 19 + React Compiler      |
| Styling       | Tailwind CSS v4                |
| Database      | PostgreSQL (Supabase)          |
| Auth          | Supabase Auth + custom tokens  |
| Real-time     | Supabase Realtime (WebSocket)  |
| External APIs | Google Calendar API            |
| Testing       | Vitest + React Testing Library |

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                   │
├─────────────────────┬─────────────────────┬─────────────────────────┤
│   Web Dashboard     │   Wall Display      │   Mobile (future)       │
│   (Browser)         │   (Raspberry Pi)    │                         │
└─────────┬───────────┴─────────┬───────────┴─────────────────────────┘
          │                     │
          │  HTTP/WebSocket     │  HTTP/WebSocket
          ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS APPLICATION                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │  (auth)     │  │ (dashboard) │  │  (display)  │   Route Groups   │
│  │  Login      │  │  Calendars  │  │  Wall View  │                  │
│  │  Signup     │  │  Chores     │  │  Setup      │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
├─────────────────────────────────────────────────────────────────────┤
│                         API ROUTES                                  │
│  /api/calendars  /api/chores  /api/displays  /api/google  /api/cron │
├─────────────────────────────────────────────────────────────────────┤
│                       SERVICE LAYER                                 │
│  lib/google/     lib/calendar/    lib/chores/     lib/crypto.ts     │
└─────────────────────────────────────────────────────────────────────┘
          │                     │
          ▼                     ▼
┌─────────────────────┐  ┌─────────────────────────────────────────────┐
│   Google APIs       │  │              SUPABASE                       │
│   - OAuth 2.0       │  │  ┌─────────────┐  ┌────────────────────┐    │
│   - Calendar API    │  │  │  PostgreSQL │  │  Realtime (WS)     │    │
└─────────────────────┘  │  │  + RLS      │  │  Table changes     │    │
                         │  └─────────────┘  └────────────────────┘    │
                         │  ┌─────────────┐                            │
                         │  │  Auth       │                            │
                         │  │  Sessions   │                            │
                         │  └─────────────┘                            │
                         └─────────────────────────────────────────────┘
```

## Directory Structure

```
/app
├── (auth)/              # Login, signup, password reset
├── (dashboard)/         # Protected user-facing pages
│   ├── calendars/       # Calendar views and connections
│   ├── chores/          # Chore management
│   └── settings/        # User and display settings
├── (display)/           # Wall display pages (token auth)
└── api/                 # REST endpoints

/components
├── calendar/            # Calendar view components
├── chores/              # Chore UI components
├── display/             # Display-specific components
└── ui/                  # Shared UI primitives

/lib
├── supabase/            # DB client factories
├── google/              # OAuth and Calendar API
├── calendar/            # Calendar domain logic
├── chores/              # Chore domain logic
└── display/             # Display types and utilities
```

## Core Domains

### 1. Calendar Integration

Syncs Google Calendar events to display on dashboards and wall displays.

**Flow:**

1. User authorizes via Google OAuth
2. Tokens encrypted (AES-256-GCM) and stored
3. Background cron syncs events periodically
4. Events displayed with source-specific colors

**Key files:** `lib/google/`, `lib/calendar/queries.ts`, `components/calendar/`

### 2. Chore Management

Household task definitions with assignments, recurrence, and points.

**Features:**

- RRULE-based recurrence (daily, weekly, biweekly, monthly)
- Point values for gamification
- Leaderboard tracking
- Completion history

**Key files:** `lib/chores/recurrence.ts`, `components/chores/`, `app/api/chores/`

### 3. Display Devices

Wall-mounted Raspberry Pi displays showing calendars and chores.

**Features:**

- Token-based authentication (no user login required)
- Real-time updates via WebSocket
- Configurable widgets and themes
- Heartbeat for online status

**Key files:** `lib/display/`, `components/display/`, `app/(display)/`

## Data Model

```
households
├── users (1:N)
├── calendar_sources (1:N) ──► events (1:N)
├── chores (1:N) ──► chore_assignments (1:N)
└── displays (1:N)
```

**Key tables:**

| Table               | Purpose                       |
| ------------------- | ----------------------------- |
| `households`        | Multi-tenant container        |
| `users`             | Household members             |
| `calendar_sources`  | OAuth-connected calendars     |
| `events`            | Synced calendar events        |
| `chores`            | Task definitions              |
| `chore_assignments` | Task instances with due dates |
| `displays`          | Registered wall devices       |

All tables enforce Row Level Security (RLS) by `household_id`.

## Authentication

### User Auth (Dashboard)

- Supabase Auth with email/password
- JWT stored in httpOnly cookies
- Middleware validates and refreshes sessions

### Google OAuth (Calendar Sync)

- OAuth 2.0 with refresh token flow
- Tokens encrypted at rest with AES-256-GCM
- Auto-refresh with 5-minute expiry buffer

### Display Auth (Wall Devices)

- Unique 32-byte token per device
- Token sent via `x-display-token` header and cookie
- No user session required

## API Structure

| Endpoint                            | Purpose                     |
| ----------------------------------- | --------------------------- |
| `GET/POST /api/calendars/sources`   | Manage calendar connections |
| `GET /api/calendars/events`         | Fetch events for date range |
| `POST /api/calendars/sync`          | Trigger calendar sync       |
| `GET/POST /api/chores`              | List/create chores          |
| `GET/PATCH/DELETE /api/chores/[id]` | Chore CRUD                  |
| `GET/POST /api/chores/assignments`  | Manage assignments          |
| `GET/PATCH /api/displays`           | Manage display devices      |
| `POST /api/displays/[id]/heartbeat` | Device online ping          |
| `GET /api/google/authorize`         | OAuth consent URL           |
| `GET /api/google/callback`          | OAuth callback              |
| `POST /api/cron/sync`               | Background sync job         |

## Real-Time Updates

Display devices receive live updates via Supabase Realtime:

```
DisplayProvider
└── RealtimeProvider
    ├── Subscribe: events table
    ├── Subscribe: calendar_sources table
    └── Subscribe: chore_assignments table
```

When data changes in the database, PostgreSQL triggers push updates through the WebSocket to connected displays, which re-render without page refresh.

## State Management

| Context   | Pattern           | Usage                                    |
| --------- | ----------------- | ---------------------------------------- |
| Dashboard | SWR               | API data fetching with auto-revalidation |
| Display   | Context + Reducer | Centralized state for real-time updates  |
| Forms     | React useState    | Local form state                         |
| Server    | Direct DB queries | Server Components fetch data             |

## Security

1. **RLS**: All queries filtered by `household_id` at database level
2. **Encryption**: OAuth tokens encrypted with AES-256-GCM
3. **Token Isolation**: Displays access only their household's data
4. **CSRF**: OAuth state parameter validated
5. **Cookies**: httpOnly, secure, sameSite for auth tokens
6. **Service Role**: Only used server-side for cron jobs

## Environment Variables

| Variable                        | Purpose              |
| ------------------------------- | -------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key       |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server admin key     |
| `GOOGLE_CLIENT_ID`              | OAuth client ID      |
| `GOOGLE_CLIENT_SECRET`          | OAuth client secret  |
| `GOOGLE_REDIRECT_URI`           | OAuth callback URL   |
| `ENCRYPTION_KEY`                | 32-byte base64 key   |
| `CRON_SECRET`                   | Vercel cron secret   |

## Deployment

- **Host**: Vercel (serverless)
- **Database**: Supabase (PostgreSQL)
- **Cron**: Vercel Cron for background sync
- **CDN**: Vercel Edge Network
