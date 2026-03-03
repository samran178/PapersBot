# PaperBot - Exam Management System

## Overview

PaperBot is a web-based exam management platform for University of Gujrat, developed by Samran Taimoor | Arzoo Fatima. It allows teachers to create and publish exams, and students to attempt them online.

- **Teacher side**: Create exams with MCQ/short/long questions, AI-assisted generation from PDF or text, publish/unpublish, view student results, manually grade subjective answers (with AI grading suggestions).
- **Student side**: Browse published exams with deadline badges, attempt with countdown timer, view scored results; expired exams listed separately.
- **AI Integration**: OpenAI GPT-4o powered question generation and subjective answer grading suggestions.
- **Exam partitions**: Questions organised into Section A/B/C/D on the attempt page by partition (1–4).
- **Availability window**: `available_days` field on exams; students cannot start after the deadline.
- **Scoring**: MCQ auto-graded at submission; subjective answers scored by teacher (or AI suggestion); final score = average of all graded answers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (unchanged from original)

- **Framework**: React + Vite, TypeScript
- **Routing**: `wouter` with protected routes (teacher/student roles)
- **State**: TanStack React Query
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **Build output**: `dist/public/` (served by Django)

### Backend — Python / Django

The backend was migrated from Node.js/Express to Python/Django to integrate with the broader FYP stack (Python + Django + PostgreSQL + React).

- **Framework**: Django 5.x with plain function-based views (no DRF needed)
- **Entry point**: `manage.py` → Django development server on port 5000
- **Project config**: `paperbot/settings.py`, `paperbot/urls.py`
- **API app**: `api/` — models, views, urls, openai_service
- **Session auth**: Django built-in `django.contrib.sessions` with DB backend
- **CORS**: `django-cors-headers` (allow all origins in dev)
- **PDF parsing**: `pypdf`
- **AI**: `openai` Python package → GPT-4o

### How It Runs

The workflow command is `bash run.sh` which:
1. Builds the React frontend (`npm run build` → `dist/public/`)
2. Creates Django migrations (`python manage.py makemigrations api`)
3. Applies migrations (`python manage.py migrate --fake-initial`)
4. Starts Django on port 5000

Django serves both:
- `/api/*` → REST API endpoints
- All other routes → `dist/public/index.html` (React SPA)
- Static assets (`.js`, `.css`, etc.) → files from `dist/public/`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Get current user |
| GET | /api/exams | List all exams |
| POST | /api/exams | Create exam with questions |
| POST | /api/exams/generate | AI-generate questions (multipart) |
| GET | /api/exams/:id | Get exam detail |
| PATCH | /api/exams/:id | Update exam |
| DELETE | /api/exams/:id | Delete exam |
| POST | /api/exams/:id/publish | Publish exam |
| GET | /api/attempts | List attempts |
| POST | /api/attempts/start | Start attempt |
| GET | /api/attempts/:id | Get attempt detail |
| POST | /api/attempts/:id/submit | Submit answers |

### Database Schema (PostgreSQL)

Tables (same names kept from original schema):
- `users` — id, username, password, role (teacher/student)
- `exams` — id, teacher_id, title, description, duration_minutes, is_published, created_at
- `questions` — id, exam_id, type (mcq/short/long), partition, text, options (JSONB), correct_answer
- `attempts` — id, exam_id, student_id, current_partition, start_time, end_time, score, is_completed, is_timeout
- `attempt_answers` — id, attempt_id, question_id, answer

Django also creates:
- `django_session` — session storage
- `django_content_type`, `django_migrations` — Django internals

### Key Python Files

| File | Purpose |
|------|---------|
| `manage.py` | Django management script |
| `paperbot/settings.py` | Django configuration |
| `paperbot/urls.py` | Root URL routing + static file serving |
| `paperbot/wsgi.py` | WSGI application |
| `api/models.py` | Django ORM models |
| `api/views.py` | All API view functions |
| `api/urls.py` | API URL patterns |
| `api/openai_service.py` | AI question generation |
| `run.sh` | Startup script |

### Business Logic

- Score stored as percentage (0–100). 70%+ is passing (shown green).
- Correct answers are stripped server-side before sending to students.
- All questions shown at once during attempt (no partition filtering for students).
- Passwords stored as plaintext (matches original behavior; hash in production).

## External Dependencies

| Dependency | Purpose |
|---|---|
| **PostgreSQL** | Primary database (PGDATABASE, PGUSER, PGPASSWORD, PGHOST, PGPORT env vars) |
| **OpenAI API** | AI question generation (AI_INTEGRATIONS_OPENAI_API_KEY, AI_INTEGRATIONS_OPENAI_BASE_URL) |
| **django** | Python web framework |
| **django-cors-headers** | CORS middleware |
| **psycopg2-binary** | PostgreSQL driver for Python |
| **pypdf** | PDF text extraction |
| **openai** (Python) | OpenAI Python client |
| **React + Vite** | Frontend framework and bundler |
| **shadcn/ui + Tailwind** | UI components |
