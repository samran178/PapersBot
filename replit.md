# PaperBot - Exam Management System

## Overview

PaperBot is a web-based exam management platform that allows teachers to create, manage, and publish exams, and students to attempt them. Key features include:

- **Teacher side**: Create exams with multiple question types (MCQ, short, long), AI-assisted question generation from uploaded documents or text, publish/unpublish exams, and view student attempt results.
- **Student side**: Browse published exams, attempt them with a countdown timer, submit answers, and view results with scores.
- **AI Integration**: OpenAI-powered question generation from pasted text or uploaded PDF files.
- The app is branded as "PaperBot" and targets educational institutions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React (with Vite as the build tool), TypeScript, no SSR (`rsc: false`)
- **Routing**: `wouter` for client-side routing with protected routes based on user role (`teacher` or `student`)
- **State & Data Fetching**: TanStack React Query for server state, with custom hooks (`use-auth`, `use-exams`, `use-attempts`) wrapping fetch calls
- **UI Components**: shadcn/ui (New York style) built on Radix UI primitives, styled with Tailwind CSS
- **Design Tokens**: CSS custom properties for a "Professional Education" theme — deep navy + soft nude/cream palette
- **Fonts**: Inter (body), Outfit (display/headings), loaded from Google Fonts
- **Forms**: React Hook Form with Zod resolvers
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend Architecture

- **Framework**: Express.js (TypeScript, ESM), served via `tsx` in development and bundled with esbuild for production
- **Entry point**: `server/index.ts` → registers routes and serves static files
- **API Routes**: Defined in `server/routes.ts`, using route contracts from `shared/routes.ts` (Zod schemas for inputs/outputs)
- **Session Management**: `express-session` with `memorystore` (in-memory, suitable for development; should be replaced with a persistent store for production scale)
- **Authentication**: Session-based auth — userId stored in session after login. `requireAuth` middleware guards protected endpoints.
- **File Uploads**: `multer` with in-memory storage for PDF uploads
- **PDF Parsing**: `pdf-parse` used to extract text from uploaded PDFs for AI question generation
- **Storage Layer**: `server/storage.ts` defines `IStorage` interface and `DatabaseStorage` class that wraps Drizzle ORM queries
- **Build**: esbuild bundles the server; key dependencies (OpenAI, express, pg, etc.) are bundled, others are externalized

### Data Storage

- **Database**: PostgreSQL via `drizzle-orm/node-postgres` using a connection pool
- **ORM**: Drizzle ORM with schema defined in `shared/schema.ts`
- **Schema Tables**:
  - `users` — id, username, password (plaintext currently — should be hashed), role (`teacher`/`student`)
  - `exams` — id, teacherId, title, description, durationMinutes, isPublished, createdAt
  - `questions` — id, examId, type (`mcq`/`short`/`long`), partition (int, for modular exams), text, options (JSONB), correctAnswer
  - `attempts` — id, examId, studentId, currentPartition, startTime, endTime, score, isCompleted, isTimeout
  - `attemptAnswers` — id, attemptId, questionId, answer
  - `conversations` / `messages` — for AI chat integration (defined in `shared/models/chat.ts`)
- **Migrations**: Drizzle Kit manages migrations, output in `./migrations`
- **Config**: `DATABASE_URL` environment variable required

### Authentication & Authorization

- Session cookie-based authentication (`express-session`)
- `requireAuth` middleware checks `req.session.userId`
- Role-based access: frontend `ProtectedRoute` component checks `user.role` and redirects accordingly
- **Note**: Passwords are currently stored as plaintext — hashing (e.g., bcrypt) should be added

### Shared Contract Layer

- `shared/routes.ts` defines all API endpoints with Zod schemas for inputs and response shapes — used by both client hooks and server routes for type safety
- `shared/schema.ts` is the single source of truth for DB table definitions and derived TypeScript types

### Replit Integrations (Scaffolding)

The repo includes pre-wired Replit AI integration modules that are not yet hooked into the main app routes:
- `server/replit_integrations/chat/` — OpenAI chat conversations (text)
- `server/replit_integrations/audio/` — Voice chat (speech-to-text, TTS, streaming PCM16 audio)
- `server/replit_integrations/image/` — Image generation via gpt-image-1
- `server/replit_integrations/batch/` — Rate-limited batch processing utilities
- Client-side audio utilities in `client/replit_integrations/audio/`

These modules use `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` env vars.

### Timer & Exam Attempt Flow

- Timer is client-side only: initialized from `attempt.exam.durationMinutes * 60` seconds
- Auto-submission triggers when timer hits 0
- Modular exam support is partially designed (partition field on questions, currentPartition on attempts) but full modular flow (sequential parts, inter-part breaks) is not yet fully implemented

## External Dependencies

| Dependency | Purpose |
|---|---|
| **PostgreSQL** | Primary relational database (`DATABASE_URL` env var required) |
| **OpenAI API** (`AI_INTEGRATIONS_OPENAI_API_KEY` + `AI_INTEGRATIONS_OPENAI_BASE_URL`) | AI question generation from text/PDF, also used by chat/audio/image integrations |
| **Google Fonts** | Inter and Outfit fonts loaded in `index.html` and `index.css` |
| **Radix UI** | Headless accessible UI primitives (all `@radix-ui/react-*` packages) |
| **TanStack React Query** | Server state management and caching on the client |
| **Drizzle ORM + drizzle-kit** | Database ORM and migration tooling |
| **multer** | File upload handling for PDF AI generation |
| **pdf-parse** | PDF text extraction |
| **memorystore** | In-memory session store (dev-appropriate; not durable across restarts) |
| **express-session** | Server-side session management |
| **wouter** | Lightweight React client-side router |
| **date-fns** | Date formatting across UI |
| **lucide-react** | Icon set |
| **Vite** | Frontend dev server and bundler |
| **esbuild** | Server-side production bundler |