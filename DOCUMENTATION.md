# PaperBot — Complete Project Documentation

**Developed under:** University of Gujrat  
**Developed by:** Samran Taimoor | Arzoo Fatima

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [Project Structure](#5-project-structure)
6. [API Reference](#6-api-reference)
7. [Authentication Flow](#7-authentication-flow)
8. [Teacher Module](#8-teacher-module)
9. [Student Module](#9-student-module)
10. [AI Exam Generation](#10-ai-exam-generation)
11. [Running the Application](#11-running-the-application)
12. [Environment Variables](#12-environment-variables)
13. [Key Design Decisions](#13-key-design-decisions)
14. [Security Notes](#14-security-notes)

---

## 1. Project Overview

PaperBot is a full-stack web application for intelligent exam management, developed for university-level educational use at the **University of Gujrat**.

**Teacher capabilities:**
- Create and manage exam papers with multiple question types (MCQ, short answer, long answer)
- Generate complete exam papers automatically using AI (OpenAI GPT-4o) from pasted notes or uploaded PDFs
- Publish exams to make them visible to students
- View student attempt results with scores

**Student capabilities:**
- Browse and start published exams
- Attempt exams online with a live countdown timer
- Get auto-graded scores for MCQ questions immediately on submission
- Review past exam results

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React + Vite (TypeScript) | Single-page application UI |
| Frontend Routing | wouter | Lightweight client-side routing |
| Frontend State | TanStack React Query | Server state management and caching |
| Frontend UI | shadcn/ui + Radix UI + Tailwind CSS | Component library and styling |
| Frontend Forms | React Hook Form + Zod | Form state and validation |
| **Backend Framework** | **Python / Django 5.x** | **REST API server** |
| **Backend ORM** | **Django ORM** | **Database access layer** |
| **Backend Sessions** | **Django Sessions (DB-backed)** | **Session-based authentication** |
| **Backend CORS** | **django-cors-headers** | **Cross-origin support** |
| **AI Integration** | **OpenAI GPT-4o (Python `openai` library)** | **AI question generation** |
| **PDF Parsing** | **pypdf (Python)** | **Extract text from uploaded PDFs** |
| Database | PostgreSQL | Persistent relational data storage |
| Build | Vite (npm run build) | Compiles React → `dist/public/` |
| Startup | `bash run.sh` | Orchestrates build → migrate → serve |

> **Note:** The backend was migrated from Node.js/Express to **Python/Django** to align with the broader FYP integration stack (Python + Django + PostgreSQL + React).

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Browser (Client)                   │
│          React SPA served at port 5000               │
│   Auth | Teacher Dashboard | Student Dashboard       │
│   Exam Editor | Exam Attempt | Result Page           │
└───────────────────┬──────────────────────────────────┘
                    │ HTTP requests (same-origin)
                    │ Session cookie (sessionid)
┌───────────────────▼──────────────────────────────────┐
│            Django Development Server                 │
│                   Port 5000                          │
│                                                      │
│  /api/auth/*   ── Authentication views               │
│  /api/exams/*  ── Exam CRUD + AI generation          │
│  /api/attempts/* ─ Attempt management                │
│  /assets/*     ── Static JS/CSS from dist/public/    │
│  /*            ── dist/public/index.html (React SPA) │
└───────────────────┬──────────────────────────────────┘
                    │ psycopg2 connection
┌───────────────────▼──────────────────────────────────┐
│               PostgreSQL Database                    │
│   users | exams | questions | attempts               │
│   attempt_answers | django_session                   │
└──────────────────────────────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────────┐
│             OpenAI API (GPT-4o)                      │
│        For AI exam question generation               │
└──────────────────────────────────────────────────────┘
```

---

## 4. Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT | Primary key, auto-increment |
| username | TEXT | Unique constraint |
| password | TEXT | Plaintext (hash in production) |
| role | TEXT | `'teacher'` or `'student'` |

### `exams`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT | Primary key |
| teacher_id | BIGINT | FK → users.id |
| title | TEXT | Exam title |
| description | TEXT | Optional student instructions |
| duration_minutes | INTEGER | Time limit in minutes |
| is_published | BOOLEAN | Default `false` (draft mode) |
| created_at | DATETIME | Auto-set on creation |

### `questions`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT | Primary key |
| exam_id | BIGINT | FK → exams.id |
| type | TEXT | `'mcq'`, `'short'`, or `'long'` |
| partition | INTEGER | Section number (1–4, for grouping) |
| text | TEXT | Question body |
| options | JSONB | Array of option strings (MCQ only) |
| correct_answer | TEXT | Correct option (MCQ) or answer guideline |

### `attempts`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT | Primary key |
| exam_id | BIGINT | FK → exams.id |
| student_id | BIGINT | FK → users.id |
| current_partition | INTEGER | Default 1 |
| start_time | DATETIME | Auto-set on creation |
| end_time | DATETIME | Set when submitted |
| score | INTEGER | Percentage 0–100 |
| is_completed | BOOLEAN | Default `false` |
| is_timeout | BOOLEAN | `true` if auto-submitted due to timer |

### `attempt_answers`
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT | Primary key |
| attempt_id | BIGINT | FK → attempts.id |
| question_id | BIGINT | FK → questions.id |
| answer | TEXT | Student's submitted answer |

### Django Internal Tables
| Table | Purpose |
|-------|---------|
| `django_session` | Session store for auth cookies |
| `django_content_type` | Content type framework (required by sessions) |
| `django_migrations` | Migration tracking history |

---

## 5. Project Structure

```
/
├── manage.py                      # Django entry point
├── run.sh                         # Startup script (build → migrate → serve)
├── DOCUMENTATION.md               # This file
├── replit.md                      # Replit project metadata
│
├── paperbot/                      # Django project package
│   ├── __init__.py
│   ├── settings.py                # Database, sessions, CORS, timezone settings
│   ├── urls.py                    # Root URL config + static file serving
│   └── wsgi.py                    # WSGI application entry point
│
├── api/                           # Django REST API application
│   ├── __init__.py
│   ├── models.py                  # ORM models (User, Exam, Question, Attempt, AttemptAnswer)
│   ├── views.py                   # All 14 API view functions
│   ├── urls.py                    # API URL patterns
│   ├── openai_service.py          # GPT-4o question generation service
│   └── migrations/
│       ├── __init__.py
│       └── 0001_initial.py        # Initial migration
│
├── client/                        # React frontend (unchanged from original)
│   └── src/
│       ├── App.tsx                # Route definitions + auth guards
│       ├── pages/
│       │   ├── auth.tsx           # Login / Register page
│       │   ├── teacher-dashboard.tsx  # Exam management + recent activity
│       │   ├── student-dashboard.tsx  # Available exams + completed results
│       │   ├── create-exam.tsx    # Create / Edit exam (with AI generation)
│       │   ├── exam-details.tsx   # Teacher's exam detail + student attempts table
│       │   ├── exam-attempt.tsx   # Student exam-taking page (timer + questions)
│       │   └── attempt-result.tsx # Post-submission score result page
│       ├── hooks/
│       │   ├── use-auth.ts        # Login, register, logout mutations
│       │   ├── use-exams.ts       # Exam list, create, update, publish, generate
│       │   └── use-attempts.ts    # Start, get, submit attempt
│       └── components/
│           └── layout.tsx         # Shared navigation + logout
│
├── shared/
│   ├── routes.ts                  # API contract (paths + Zod schemas)
│   └── schema.ts                  # Database insert/select type schemas
│
└── dist/
    └── public/                    # Built React app (served by Django)
        ├── index.html
        └── assets/                # Compiled JS, CSS, images
```

---

## 6. API Reference

All endpoints are under the `/api/` prefix. Session cookie (`sessionid`) is used for authentication.

### 6.1 Authentication Endpoints

| Method | Path | Description | Body |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Create new account | `{username, password, role}` |
| POST | `/api/auth/login` | Log in | `{username, password}` |
| POST | `/api/auth/logout` | Log out (clears session) | — |
| GET | `/api/auth/me` | Get current user | — |

**Register / Login body example:**
```json
{ "username": "Ahmed", "password": "mypassword", "role": "student" }
```

**User response:**
```json
{ "id": 1, "username": "Ahmed", "role": "student" }
```

### 6.2 Exam Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/exams` | List all exams (with questions, students see no answers) |
| POST | `/api/exams` | Create exam + questions |
| GET | `/api/exams/:id` | Get single exam |
| PATCH | `/api/exams/:id` | Update exam + questions |
| DELETE | `/api/exams/:id` | Delete exam + all attempts + answers |
| POST | `/api/exams/:id/publish` | Publish exam (students can see it) |
| POST | `/api/exams/generate` | Generate questions with AI (multipart/form-data) |

**Create exam body:**
```json
{
  "title": "Physics Midterm",
  "description": "Covers chapters 1–5",
  "durationMinutes": 60,
  "questions": [
    {
      "text": "What is Newton's second law?",
      "type": "mcq",
      "partition": 1,
      "options": ["F=ma", "E=mc²", "v=u+at", "P=mv"],
      "correctAnswer": "F=ma"
    },
    {
      "text": "Describe the concept of inertia.",
      "type": "long",
      "partition": 2,
      "options": [],
      "correctAnswer": "Inertia is the tendency of an object to resist changes in its state of motion."
    }
  ]
}
```

**Generate exam (multipart/form-data fields):**
- `file` — optional PDF upload
- `text` — optional raw text material
- `difficulty` — `easy | medium | hard | complex`
- `shortQuestions` — number of MCQ questions
- `longQuestions` — number of long-form questions

### 6.3 Attempt Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/attempts` | Teacher: all attempts for their exams. Student: their own attempts |
| POST | `/api/attempts/start` | Start or resume an attempt |
| GET | `/api/attempts/:id` | Get full attempt with exam + questions |
| POST | `/api/attempts/:id/submit` | Submit answers + calculate score |

**Start attempt body:**
```json
{ "examId": 5 }
```

**Submit attempt body:**
```json
{
  "answers": [
    { "questionId": 12, "answer": "F=ma" },
    { "questionId": 13, "answer": "Inertia resists changes in motion..." }
  ]
}
```

**Submit attempt response includes:**
```json
{
  "id": 3,
  "examId": 5,
  "studentId": 2,
  "score": 85,
  "isCompleted": true,
  "endTime": "2026-03-03T10:45:00"
}
```

---

## 7. Authentication Flow

```
1. User fills in username + password + role
2. POST /api/auth/register  (or /api/auth/login)
3. Django: verifies/creates user, sets request.session['user_id'] = user.id
4. Django: saves session to django_session table
5. Browser: stores sessionid cookie (HttpOnly, SameSite=Lax)
6. All future requests: browser auto-sends cookie (same-origin)
7. Django: reads cookie → session → user_id for every request
8. Logout: POST /api/auth/logout → request.session.flush() → clears cookie
```

Protected views use the `@require_auth` decorator which returns HTTP 401 if no session.

---

## 8. Teacher Module

### Registration & Login
- Register with role = `teacher`
- Login with existing credentials

### Creating an Exam (Manual)
1. Click **Create New Exam**
2. Fill title, optional description, and duration (minutes)
3. Add questions using the question editor:
   - **MCQ**: 4 options, select one as the correct answer
   - **Short**: Text answer with a guideline
   - **Long**: Detailed text answer with a guideline
4. Click **Save Exam** → exam is saved as Draft

### Creating an Exam (AI-Assisted)
1. Paste lecture notes/material OR upload a PDF file
2. Set difficulty and number of questions (MCQ + long)
3. Click **Generate Exam Questions**
4. GPT-4o generates title + questions (pre-filled into the editor)
5. Review and adjust questions, then save

### Managing Exams
- **Publish**: Makes exam visible to students. Cannot be unpublished.
- **Edit**: Modify title, description, duration, and any question
- **Delete**: Permanently removes exam and all student attempts
- **View**: Exam details page with question list and student attempt table

### Viewing Student Results
- Teacher dashboard shows **Recent Activity** (latest 6 attempts)
- Exam details page shows a table: Student, Status, Started At, Score

---

## 9. Student Module

### Available Exams
- Only published exams are shown
- Exams already completed by this student are hidden from the available list

### Taking an Exam
1. Click **Start Exam** → POST `/api/attempts/start` creates an attempt
2. All questions are shown at once on one page
3. Timer counts down from `durationMinutes × 60` seconds
4. MCQ questions: click radio button to select answer
5. Short/Long questions: type in a text area
6. Click **Submit Exam** (or auto-submits when timer hits 0)

### Score Calculation
- Only **MCQ** questions are auto-graded
- Score = `(correct MCQs / total MCQs) × 100`, rounded to nearest integer
- Short/Long answers are not auto-graded (placeholder for teacher review)
- **70% or above = Passing** (displayed in green)
- **Below 70% = Needs Improvement** (displayed in amber)

### Result Page
- Shows final percentage score
- Shows submission time
- Indicates if auto-submitted due to timeout
- Link back to student dashboard

---

## 10. AI Exam Generation

### How It Works

The AI generation uses **OpenAI GPT-4o** via the `openai` Python library:

1. Input: text material + configuration (difficulty, question counts)
2. If PDF uploaded: `pypdf.PdfReader` extracts all text from the PDF pages
3. A structured prompt is sent to `gpt-4o` with `response_format: json_object`
4. GPT-4o returns a JSON object with `title` and `questions` array
5. Questions are pre-populated into the exam editor for review

### AI Response Format
```json
{
  "title": "Introduction to Python Programming",
  "questions": [
    {
      "text": "Which of the following is a mutable data type in Python?",
      "type": "mcq",
      "partition": 1,
      "options": ["Tuple", "String", "List", "Integer"],
      "correctAnswer": "List"
    },
    {
      "text": "Explain the difference between a list and a tuple in Python.",
      "type": "long",
      "partition": 2,
      "options": [],
      "correctAnswer": "Lists are mutable and defined with [], tuples are immutable and defined with ()."
    }
  ]
}
```

### API File: `api/openai_service.py`
- Function: `generate_exam_questions(text, options)` → dict
- Model: `gpt-4o`
- Max input: ~15,000 characters of text

---

## 11. Running the Application

### Development (Replit)
```bash
bash run.sh
```

**What `run.sh` does:**
```bash
# Step 1: Build React frontend
npm run build                                    # → dist/public/

# Step 2: Create Django migration files
python manage.py makemigrations api --no-input

# Step 3: Apply migrations (handles pre-existing tables safely)
python manage.py migrate --fake-initial --no-input

# Step 4: Start Django server
python manage.py runserver 0.0.0.0:5000
```

The `--fake-initial` flag tells Django:
- If all tables in the initial migration already exist → mark migration as applied (skip creation)
- If tables don't exist → create them normally

### How Django Serves the Frontend

`paperbot/urls.py` uses a catch-all pattern:
1. `/api/*` → routed to API views
2. `/*.ext` (paths with file extensions) → served from `dist/public/`
3. `/*` → serves `dist/public/index.html` (React SPA, handles its own routing)

---

## 12. Environment Variables

These are managed as Replit Secrets:

| Variable | Required | Description |
|----------|----------|-------------|
| `PGDATABASE` | Yes | PostgreSQL database name |
| `PGUSER` | Yes | PostgreSQL username |
| `PGPASSWORD` | Yes | PostgreSQL password |
| `PGHOST` | Yes | PostgreSQL host address |
| `PGPORT` | No | PostgreSQL port (default: 5432) |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | For AI | OpenAI API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | For AI | OpenAI API base URL |
| `DJANGO_SECRET_KEY` | Recommended | Django secret key (has dev default) |

---

## 13. Key Design Decisions

| Decision | Why |
|----------|-----|
| **Python/Django backend** | Required for FYP integration with the other project's Python/Django stack |
| **Django ORM with `db_table`** | Maps to existing PostgreSQL table names to preserve any existing data |
| **`--fake-initial` migration** | Safely handles databases with pre-existing tables (e.g., from the old Node.js backend) |
| **All questions shown at once** | Better student UX; no partition filtering during exam attempts |
| **Score as percentage (0–100)** | Clear, meaningful metric; 70% threshold for pass/fail |
| **Correct answers stripped server-side** | Students cannot inspect answers through API responses |
| **`USE_TZ = False`** | Matches existing PostgreSQL `timestamp` columns; avoids timezone-aware/naive mixing |
| **Django session cookies** | Same-origin cookie behavior; no token management needed on the frontend |
| **Single workflow** | `bash run.sh` handles the full startup sequence in one step |

---

## 14. Security Notes

| Issue | Current State | Production Recommendation |
|-------|--------------|--------------------------|
| Passwords | Stored as plaintext | Use `bcrypt` or Django's built-in `make_password()` |
| Session cookies | `HttpOnly=True`, `SameSite=Lax` | Add `Secure=True` flag on HTTPS |
| CORS | Open to all origins | Restrict to specific allowed origins |
| Django secret key | Has development default | Set a strong random value as environment secret |
| Debug mode | `DEBUG=True` | Set `DEBUG=False` in production |
| Correct answers | Stripped server-side ✓ | Already secure |
| API rate limiting | None | Add Django ratelimit or throttling |
