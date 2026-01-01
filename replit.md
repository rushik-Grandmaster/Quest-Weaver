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