# LifeRPG - Gamified Productivity Application

## Overview

LifeRPG is a gamified productivity and habit-tracking application that transforms daily tasks into quests. Users earn XP and points by completing tasks, level up over time, purchase rewards from a custom shop, and track their journey through a diary and schedule planner. The application uses a "gaming aesthetic" with dark mode theming, animations, and RPG-inspired terminology (quests, gold, inventory).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with custom gaming-themed design tokens (dark mode by default)
- **UI Components**: Radix UI primitives with shadcn/ui component library (new-york style)
- **Animations**: Framer Motion for page transitions, XP bars, and level-up effects
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ES modules)
- **API Structure**: RESTful endpoints under `/api/*` prefix
- **Authentication**: Replit Auth via OpenID Connect (OIDC) with Passport.js
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization

### Key Data Models
- **users/sessions**: Mandatory for Replit Auth (do not modify)
- **userStats**: Tracks level, XP, points (gold), streak, and last login
- **tasks**: Quests with categories (daily/habit/one_time), difficulty, and rewards
- **shopItems**: Purchasable rewards (system or user-created)
- **inventory**: Items owned by users with usage tracking
- **scheduleItems**: Daily planner events with start/end times
- **diaryEntries**: Journal entries with mood tracking
- **physiqueEntries** (private/owner-only): Progress photos with optional weight, body fat, pose, notes, and dated timeline. Photos stored as base64 data URLs in PostgreSQL (compressed client-side to ~1280px JPEG).

### Owner-Only / Private Routes
- A `requireOwner` middleware in `server/routes.ts` restricts certain endpoints (`/api/physique/*`) to user ID `26147528` (rushi30283@gmail.com). Anyone else gets a 403.
- Frontend hides owner-only nav items via `useAuth().user.id === OWNER_USER_ID`.
- Defense-in-depth: page also renders a "private archive" lock screen if a non-owner navigates directly to `/physique`.

### Vault Password (per-user lock)
- `vaultLocks` table (`shared/schema.ts`): per-user `passwordHash` (`salt:hash` scrypt), optional `hint`.
- Backend (`server/routes.ts`): scrypt `hashPassword`/`verifyPassword`; `requireVaultUnlocked` middleware (no-op when no lock set, else requires `req.session.vaultUnlocked === userId`, returns **423** if locked).
- Routes: `GET /api/vault/status`, `POST /api/vault/set` (auto-unlocks; requires currentPassword to change), `POST /api/vault/unlock` (350ms throttle on failure), `POST /api/vault/lock`.
- Gates applied to **diary** (list/create/update/delete) and **physique** (list/create/update/delete).
- Frontend `client/src/components/VaultGate.tsx` wraps `/diary` and `/physique` routes in `App.tsx`. Shows animated **setup** screen on first use (amber theme), **unlock** screen otherwise (indigo theme, shake on wrong password). Exports `useVaultStatus()` and `useLockVault()`.
- Navigation footer shows a "SEAL VAULT" button when vault is unlocked.

### Navigation
- `client/src/components/Navigation.tsx` — categorized sidebar (desktop) + bottom dock (mobile) + ⌘K command palette overlay.
- Nav items grouped: MAIN, TRAINING, BODY, ECONOMY, MIND, STATUS.
- Owner-only entries are tagged with a lock icon and hidden from non-owners.

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Path Aliases**: `@/*` maps to `client/src/*`, `@shared/*` maps to `shared/*`

### Gamification Logic
- XP and points are awarded on the backend when tasks are completed
- Level-up detection happens server-side and is communicated via API response
- Frontend displays animated XP bars and toast notifications for level-ups

## External Dependencies

### Database
- **PostgreSQL**: Required, connection via `DATABASE_URL` environment variable
- Session table `sessions` must exist for Replit Auth

### Authentication
- **Replit Auth**: OIDC-based authentication requiring `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables
- Users table managed automatically via upsert on login

### Frontend Libraries
- **Framer Motion**: Animation library for UI transitions
- **date-fns**: Date formatting and manipulation
- **react-day-picker**: Calendar component for schedule view
- **Lucide React**: Icon library

### Replit-Specific Integrations
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Development tooling (dev only)
- **@replit/vite-plugin-dev-banner**: Development banner (dev only)