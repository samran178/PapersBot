# PaperBot — Complete Project Documentation

**Developed under:** University of Gujrat
**Developed by:** Samran Taimoor | Arzoo Fatima

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Design](#4-database-design)
5. [Authentication — Sign Up & Login](#5-authentication--sign-up--login)
6. [Teacher Module](#6-teacher-module)
7. [Student Module](#7-student-module)
8. [Teacher–Student Interaction Flow](#8-teacherstudent-interaction-flow)
9. [AI Paper Generation](#9-ai-paper-generation)
10. [API Reference](#10-api-reference)
11. [Restrictions & Business Rules](#11-restrictions--business-rules)
12. [Project File Structure](#12-project-file-structure)

---

## 1. Project Overview

PaperBot is a full-stack web application for intelligent exam management. It allows teachers to create, manage, and publish exam papers — either manually or by using an AI model — and allows students to attempt those papers online. The system supports MCQ (auto-graded), short answer, and long answer question types.

**Key features:**
- Role-based access control (Teacher / Student)
- Manual and AI-assisted exam creation
- PDF upload support for reference material
- Automatic MCQ grading with percentage score
- Real-time exam attempt tracking
- Secure answer protection (correct answers never sent to students)

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.6 | Type-safe development |
| Vite | 7.x | Build tool and dev server |
| TailwindCSS | 3.4 | Utility-first styling |
| shadcn/ui (Radix UI) | Latest | Pre-built accessible UI components |
| Wouter | 3.3 | Client-side routing |
| TanStack Query | 5.x | Server state management and data fetching |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation on both client and server |
| Lucide React | 0.453 | Icon library |
| date-fns | 3.x | Date formatting |
| Framer Motion | 11.x | Animations |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20.x | Runtime environment |
| Express | 5.x | HTTP server and routing |
| TypeScript | 5.6 | Type-safe server code |
| tsx | 4.x | Runs TypeScript directly in development |
| express-session | 1.18 | Session-based authentication |
| memorystore | 1.6 | In-memory session store |
| multer | 2.x | File upload handling (PDF) |
| pdf-parse | 1.1 | Extracts text from uploaded PDF files |

### Database
| Technology | Version | Purpose |
|---|---|---|
| PostgreSQL | Latest | Primary relational database |
| Drizzle ORM | 0.39 | Type-safe database queries |
| Drizzle Kit | 0.31 | Schema migrations (`db:push`) |
| drizzle-zod | 0.7 | Auto-generates Zod schemas from Drizzle tables |

### AI Integration
| Technology | Purpose |
|---|---|
| OpenAI GPT-4o | Generates exam questions from text or PDF material |
| openai (npm) | Official OpenAI SDK for Node.js |

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Browser (Client)                  │
│  React + Vite + TailwindCSS + TanStack Query         │
│  Pages: /auth  /teacher  /student  /student/attempt  │
└──────────────────┬───────────────────────────────────┘
                   │  HTTP + JSON (REST API)
                   │  Session Cookie
┌──────────────────▼───────────────────────────────────┐
│                Express Server (Backend)               │
│  server/index.ts → server/routes.ts                  │
│  Handles auth, exam CRUD, attempt management         │
│  Calls OpenAI API for question generation            │
└──────────────────┬───────────────────────────────────┘
                   │  Drizzle ORM
┌──────────────────▼───────────────────────────────────┐
│                PostgreSQL Database                    │
│  Tables: users, exams, questions, attempts,          │
│          attempt_answers                              │
└──────────────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────┐
│                 OpenAI API (External)                 │
│  Model: gpt-4o                                        │
│  Used only for AI paper generation                   │
└──────────────────────────────────────────────────────┘
```

The frontend and backend run on the **same server and port** (5000). Vite serves the React frontend in development; in production the frontend is compiled into static files and served by Express.

---

## 4. Database Design

The database has five tables. All data is stored in **PostgreSQL** and accessed through **Drizzle ORM**.

### Table: `users`
Stores all registered accounts (both teachers and students).

| Column | Type | Description |
|---|---|---|
| id | SERIAL (PK) | Auto-incrementing unique ID |
| username | TEXT (UNIQUE) | Login identifier |
| password | TEXT | Plain-text password (stored as-is) |
| role | TEXT | Either `"teacher"` or `"student"` |

### Table: `exams`
Each row represents one exam paper created by a teacher.

| Column | Type | Description |
|---|---|---|
| id | SERIAL (PK) | Auto-incrementing unique ID |
| teacher_id | INTEGER (FK → users) | Which teacher created this exam |
| title | TEXT | Name of the exam |
| description | TEXT | Optional instructions for students |
| duration_minutes | INTEGER | Time limit in minutes |
| is_published | BOOLEAN | If true, students can see and attempt it |
| created_at | TIMESTAMP | Auto-set to creation time |

### Table: `questions`
Each row is one question belonging to an exam.

| Column | Type | Description |
|---|---|---|
| id | SERIAL (PK) | Auto-incrementing unique ID |
| exam_id | INTEGER (FK → exams) | Which exam this question belongs to |
| type | TEXT | `"mcq"`, `"short"`, or `"long"` |
| partition | INTEGER | Grouping field (1, 2, or 3) for multi-part exams |
| text | TEXT | The question content |
| options | JSONB | Array of strings for MCQ choices; null for other types |
| correct_answer | TEXT | The correct MCQ option, or answer guideline for short/long |

### Table: `attempts`
Tracks each student's attempt at an exam.

| Column | Type | Description |
|---|---|---|
| id | SERIAL (PK) | Auto-incrementing unique ID |
| exam_id | INTEGER (FK → exams) | Which exam is being attempted |
| student_id | INTEGER (FK → users) | Which student is attempting |
| current_partition | INTEGER | Internal use; defaults to 1 |
| start_time | TIMESTAMP | When the attempt started |
| end_time | TIMESTAMP | When the attempt was submitted |
| score | INTEGER | Final score as a percentage (0–100) |
| is_completed | BOOLEAN | True once submitted |
| is_timeout | BOOLEAN | True if submitted due to time expiry |

### Table: `attempt_answers`
Stores the individual answer each student gave for each question.

| Column | Type | Description |
|---|---|---|
| id | SERIAL (PK) | Auto-incrementing unique ID |
| attempt_id | INTEGER (FK → attempts) | Which attempt this answer belongs to |
| question_id | INTEGER (FK → questions) | Which question was answered |
| answer | TEXT | The student's answer text |

### Relationships Diagram

```
users (teacher) ─────────────────── exams
                                      │
                                   questions
                                      │
users (student) ──── attempts ────────┘
                        │
                  attempt_answers
```

---

## 5. Authentication — Sign Up & Login

PaperBot uses **session-based authentication** powered by `express-session`.

### How Sign Up Works

1. The user visits `/auth` and fills in username, password, and selects a role (Teacher or Student).
2. The frontend sends a `POST /api/auth/register` request with `{ username, password, role }`.
3. The server checks if the username already exists in the `users` table.
4. If unique, it inserts the new user and starts a session by setting `req.session.userId`.
5. The user is redirected to their role-specific dashboard (`/teacher` or `/student`).

### How Login Works

1. The user enters their username and password on `/auth` (Login tab).
2. The frontend sends a `POST /api/auth/login` request.
3. The server looks up the user by username and compares passwords directly.
4. On success, `req.session.userId` is set and a session cookie is sent to the browser.
5. All subsequent API requests automatically include this cookie, which the server validates.

### Session Management

- Sessions are stored in-memory using `memorystore`.
- Sessions expire after 24 hours (`maxAge: 86400000` ms).
- Every protected route checks `req.session.userId` via a `requireAuth` middleware. If not set, it returns `401 Unauthorized`.
- Logout clears the session via `req.session.destroy()`.

### Role-Based Access

- The role is stored with the user account and returned in the session.
- The frontend checks the role on every page load via `GET /api/auth/me`.
- Teachers can only access `/teacher/*` routes; students can only access `/student/*` routes.
- If a user visits the wrong route for their role, the frontend redirects them.

---

## 6. Teacher Module

### Accessing the Teacher Dashboard

After logging in as a teacher, the user is taken to `/teacher`. This dashboard shows:
- All exams the teacher has created
- Each exam's publication status (Draft or Published)
- Options to Create, Edit, Delete, or Publish each exam

### Creating an Exam (Manual)

1. Teacher clicks "Create New Exam" → navigates to `/teacher/create`.
2. Fills in:
   - **Title** — exam name
   - **Description** — optional instructions
   - **Duration** — time limit in minutes
3. Adds questions one by one. For each question:
   - **Type**: MCQ, Short Answer, or Long Answer
   - **Question text**
   - **Partition**: Part 1, 2, or 3 (for grouping)
   - **Options** (MCQ only): 4 choices; teacher clicks the radio button next to the correct one
   - **Correct Answer / Guideline**: for short/long, a model answer
4. Clicks "Save Exam" → `POST /api/exams` saves everything in a transaction:
   - Inserts 1 row into `exams`
   - Inserts N rows into `questions` (one per question)

### Creating an Exam (AI-Assisted)

See [Section 9 — AI Paper Generation](#9-ai-paper-generation).

### Editing an Exam

- Teacher clicks "Edit" on any exam → `/teacher/edit/:id`
- Existing exam data and questions are loaded via `GET /api/exams/:id`
- Teacher modifies fields or questions and clicks "Update Exam"
- `PATCH /api/exams/:id` is called — old questions are deleted and re-created fresh in a database transaction

### Publishing an Exam

- Teacher clicks "Publish" → `POST /api/exams/:id/publish`
- Sets `is_published = true` in the database
- The exam becomes visible to all students on their dashboard
- A published exam cannot be un-published from the current UI

### Deleting an Exam

- Teacher clicks "Delete" → `DELETE /api/exams/:id`
- This deletes the exam and all related data (questions, attempts, answers) in a single transaction

### Viewing Student Results

- The teacher dashboard shows all attempts submitted by students for that teacher's exams
- Data includes: student username, exam name, score, submission time

---

## 7. Student Module

### Accessing the Student Dashboard

After logging in as a student, the user is taken to `/student`. This shows:
- **Available to Take** — published exams not yet completed
- **Completed Results** — previously submitted exams with final scores

### Attempting an Exam

1. Student clicks "Start Exam" on an available exam card.
2. The frontend sends `POST /api/attempts/start` with the `examId`.
3. The server checks if the student already has an incomplete attempt for that exam. If so, it resumes it. If not, it creates a new `attempts` row.
4. The student is redirected to `/student/attempt/:id`.
5. The attempt page fetches `GET /api/attempts/:id` which returns the attempt along with all exam questions.
6. **Correct answers are stripped server-side** before sending to the student — they can never see answers by inspecting the network.
7. All questions are displayed at once with a countdown timer.
8. The progress bar tracks how many questions have been answered.

### Submitting an Exam

1. Student answers all questions and clicks "Submit Exam".
2. All answers are sent in a single `POST /api/attempts/:id/submit` request.
3. The server:
   - Saves each answer into `attempt_answers`
   - Auto-grades all MCQ questions by comparing against stored `correct_answer`
   - Calculates score as: `(correct MCQ answers ÷ total MCQ questions) × 100`
   - Marks the attempt as `is_completed = true` and records `end_time`
4. Student is redirected to `/student/result/:id` showing the final percentage score.

### Timer

- The timer is set to the exam's `duration_minutes` and counts down client-side.
- If time reaches zero, the exam auto-submits with whatever answers have been given.

---

## 8. Teacher–Student Interaction Flow

The teacher and student dashboards do not communicate directly with each other. All interaction happens through the shared database via the server.

```
Teacher creates exam
       │
       ▼
   [DB: exams + questions tables]
       │
Teacher clicks Publish
       │
       ▼
   [DB: is_published = true]
       │
Student opens dashboard
       │
       ▼
   [GET /api/exams → returns published exams]
       │
Student clicks Start Exam
       │
       ▼
   [DB: attempts row created]
       │
Student completes + submits
       │
       ▼
   [DB: attempt_answers + score saved]
       │
Teacher views results dashboard
       │
       ▼
   [GET /api/attempts → returns all attempts for teacher's exams]
```

**Key security rule:** When a student fetches an exam or attempt, the server removes the `correctAnswer` field from every question response. Teachers see correct answers; students never do.

---

## 9. AI Paper Generation

### How It Works

1. On the Create/Edit Exam page, the teacher can paste study material text **or** upload a PDF file.
2. They configure:
   - **Difficulty**: Easy, Medium, Hard, or Complex
   - **Number of MCQs** (Short Questions): 0–20
   - **Number of Long Questions**: 0–10
3. They click "Generate Exam Questions".

### PDF Processing

- If a PDF is uploaded, the server uses `multer` to receive the file in memory.
- `pdf-parse` extracts raw text from the PDF buffer.
- That text is then passed to the OpenAI API.

### OpenAI GPT-4o Integration

- **Model used**: `gpt-4o` (high-capability model for accuracy)
- **API endpoint**: `POST` to OpenAI Chat Completions
- The server sends a structured prompt including:
  - The educational material (up to 15,000 characters)
  - Difficulty level
  - Number of MCQ questions requested
  - Number of long questions requested
- The AI is instructed to return a strict **JSON object** (using `response_format: { type: "json_object" }`) with this shape:

```json
{
  "title": "Exam title",
  "questions": [
    {
      "text": "Question text",
      "type": "mcq",
      "partition": 1,
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A"
    },
    {
      "text": "Descriptive question",
      "type": "long",
      "partition": 2,
      "options": [],
      "correctAnswer": "Model answer guideline"
    }
  ]
}
```

- The generated questions are loaded into the exam creation form.
- The teacher can review, edit, or add more questions before saving.
- API key is stored securely as an environment variable (`AI_INTEGRATIONS_OPENAI_API_KEY`).

---

## 10. API Reference

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Login and start a session |
| POST | `/api/auth/logout` | Destroy the session |
| GET | `/api/auth/me` | Get currently logged-in user |

### Exams

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/exams` | All | List all exams (with questions) |
| POST | `/api/exams` | Teacher | Create a new exam with questions |
| GET | `/api/exams/:id` | All | Get one exam with its questions |
| PATCH | `/api/exams/:id` | Teacher | Update exam details and questions |
| DELETE | `/api/exams/:id` | Teacher | Delete exam and all related data |
| POST | `/api/exams/:id/publish` | Teacher | Publish an exam to students |
| POST | `/api/exams/generate` | Teacher | Generate questions via AI |

### Attempts

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/attempts` | All | List attempts (filtered by role) |
| POST | `/api/attempts/start` | Student | Start or resume an exam attempt |
| GET | `/api/attempts/:id` | All | Get a specific attempt with exam data |
| POST | `/api/attempts/:id/submit` | Student | Submit answers and complete attempt |

---

## 11. Restrictions & Business Rules

### Authentication Restrictions
- Usernames must be unique — duplicate registration is rejected with a 400 error.
- All routes except `/api/auth/*` require an active session. Unauthenticated requests receive `401 Unauthorized`.
- There is no password reset feature in the current version.

### Teacher Restrictions
- A teacher can only see and manage their own exams.
- An exam cannot be attempted by students until explicitly published.
- Deleting an exam also permanently deletes all student attempts and answers for that exam.
- The AI generator accepts up to 15,000 characters of text from a PDF or pasted input.

### Student Restrictions
- Students can only see exams that are published (`is_published = true`).
- A student can only have one active (incomplete) attempt per exam at a time. Starting the same exam again resumes the existing attempt.
- Students cannot see correct answers — the server strips the `correctAnswer` field from all responses sent to students.
- Once an exam is submitted (`is_completed = true`), the student cannot re-attempt it.

### Scoring Rules
- Only MCQ questions are auto-graded.
- Short and long answer questions contribute to the question count shown but are not auto-graded (teacher reviews manually).
- Score formula: `floor((correct MCQ answers ÷ total MCQ questions) × 100)`
- If an exam has no MCQ questions, the score is 0.
- A score of 70% or above is considered a passing grade (shown in green; below is shown in amber).

### Exam Rules
- Duration is enforced client-side with a countdown timer. When time expires, the exam auto-submits.
- All questions are shown at once during an attempt (no hidden sections).
- Questions must have non-empty text to be saved.
- MCQ questions require all 4 options to be filled before saving.
- Every question requires a correct answer or answer guideline before saving.

---

## 12. Project File Structure

```
/
├── client/                        # Frontend (React + Vite)
│   └── src/
│       ├── App.tsx                # Route definitions
│       ├── main.tsx               # React entry point
│       ├── pages/
│       │   ├── auth.tsx           # Login / Register page
│       │   ├── teacher-dashboard.tsx   # Teacher home
│       │   ├── create-exam.tsx    # Create / Edit exam
│       │   ├── student-dashboard.tsx   # Student home
│       │   ├── exam-attempt.tsx   # Active exam page
│       │   └── attempt-result.tsx # Score result page
│       ├── hooks/
│       │   ├── use-exams.ts       # Exam data fetching hooks
│       │   └── use-attempts.ts    # Attempt data fetching hooks
│       ├── components/
│       │   ├── layout.tsx         # Page wrapper with sidebar
│       │   └── ui/                # shadcn/ui component library
│       └── lib/
│           └── queryClient.ts     # TanStack Query setup
│
├── server/                        # Backend (Express + TypeScript)
│   ├── index.ts                   # Server entry point
│   ├── routes.ts                  # All API route handlers
│   ├── storage.ts                 # Database access layer (CRUD)
│   ├── db.ts                      # Drizzle + PostgreSQL connection
│   └── openai.ts                  # AI question generation logic
│
├── shared/                        # Shared between frontend & backend
│   ├── schema.ts                  # Drizzle table definitions + Zod schemas
│   └── routes.ts                  # API route paths + request/response schemas
│
├── DOCUMENTATION.md               # This file
└── package.json                   # Project dependencies and scripts
```

---

*PaperBot — University of Gujrat | Samran Taimoor | Arzoo Fatima*
