# PaperBot — Full Documentation

**Developed by:** Samran Taimoor | Arzoo Fatima  
**University:** University of Gujrat  
**Version:** 1.0  
**Last Updated:** March 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Database Models](#4-database-models)
5. [Authentication System](#5-authentication-system)
6. [API Endpoints Reference](#6-api-endpoints-reference)
7. [Frontend Pages & Features](#7-frontend-pages--features)
8. [AI Features](#8-ai-features)
9. [Part-by-Part Exam Flow](#9-part-by-part-exam-flow)
10. [Local Development Setup](#10-local-development-setup)
11. [Environment Variables](#11-environment-variables)
12. [Deployment on Replit](#12-deployment-on-replit)
13. [Known Limitations & Notes](#13-known-limitations--notes)

---

## 1. Project Overview

**PaperBot** is a full-stack web application designed for university exam management. It allows teachers to create, manage, and publish exams, and students to attempt those exams in a structured, part-by-part format.

### Key Features

- **Teacher Portal**: Create exams manually or generate questions automatically using AI from text or PDF content
- **Student Portal**: Attempt exams section by section (partitioned), with the ability to take a break between parts
- **AI Question Generation**: Teachers paste text or upload a PDF — GPT-4o generates a complete exam
- **AI-Assisted Grading**: AI suggests marks and feedback for subjective (short/long) answers
- **Manual Grading**: Teachers review and finalise marks for each student's attempt
- **Exam Deadlines**: Exams have an availability window; expired exams are clearly marked
- **Timed Exams**: A countdown timer auto-submits the current section when time runs out
- **Role-Based Access**: Separate dashboards and permissions for teachers and students

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, Django 5.x |
| **Frontend** | React 18, TypeScript, Vite |
| **Database** | PostgreSQL |
| **UI Components** | shadcn/ui, Tailwind CSS |
| **State Management** | TanStack React Query v5 |
| **Routing (Frontend)** | wouter |
| **Forms** | react-hook-form + Zod validation |
| **AI Integration** | OpenAI GPT-4o (via API) |
| **Session Auth** | Django sessions (cookie-based) |
| **Hosting** | Replit (Reserved VM deployment) |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User's Browser                        │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │          React SPA (client/src/)                     │  │
│   │  - wouter routing                                    │  │
│   │  - TanStack Query (API calls)                        │  │
│   │  - shadcn/ui components                              │  │
│   └──────────────────────┬──────────────────────────────┘  │
└──────────────────────────│──────────────────────────────────┘
                           │  HTTP (REST API + Session Cookie)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Django Server (port 5000)                  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │               api/views.py (REST API)                │  │
│   │  - Authentication endpoints                          │  │
│   │  - Exam CRUD endpoints                               │  │
│   │  - Attempt & grading endpoints                       │  │
│   │  - AI generation endpoint                            │  │
│   └──────────────┬─────────────────┬────────────────────┘  │
│                  │                 │                         │
│   ┌──────────────▼──────┐  ┌──────▼──────────────────────┐ │
│   │  PostgreSQL Database │  │   OpenAI API (GPT-4o)        │ │
│   │  - users             │  │   - Question generation      │ │
│   │  - exams             │  │   - Subjective grading       │ │
│   │  - questions         │  └─────────────────────────────┘ │
│   │  - attempts          │                                   │
│   │  - attempt_answers   │                                   │
│   └─────────────────────┘                                   │
└─────────────────────────────────────────────────────────────┘
```

**Request Flow:**
1. User opens the app → Django serves the React `index.html`
2. React loads in the browser and handles all page navigation client-side
3. React makes `fetch()` calls to `/api/...` endpoints
4. Django processes the request, queries PostgreSQL, returns JSON
5. React updates the UI with the response

---

## 4. Database Models

All models are defined in `api/models.py`. Custom database table names are used (not Django's default `api_modelname` format).

### 4.1 User

**Table:** `users`

| Field | Type | Description |
|---|---|---|
| `id` | Integer (PK, auto) | Unique identifier |
| `username` | VARCHAR(150) | Unique username |
| `password` | TEXT | User password |
| `role` | VARCHAR(10) | Either `teacher` or `student` |

### 4.2 Exam

**Table:** `exams`

| Field | Type | Description |
|---|---|---|
| `id` | Integer (PK, auto) | Unique identifier |
| `teacher` | FK → User | The teacher who created the exam |
| `title` | VARCHAR(255) | Exam title |
| `description` | TEXT | Exam description / instructions |
| `duration_minutes` | Integer | Total allowed time in minutes |
| `is_published` | Boolean | Whether students can see and attempt the exam |
| `available_days` | Integer (nullable) | Number of days the exam is available after publishing |
| `published_at` | DateTime (nullable) | When the exam was published |

### 4.3 Question

**Table:** `questions`

| Field | Type | Description |
|---|---|---|
| `id` | Integer (PK, auto) | Unique identifier |
| `exam` | FK → Exam | The exam this question belongs to |
| `type` | VARCHAR(10) | `mcq`, `short`, or `long` |
| `partition` | Integer | Section number (1, 2, 3, or 4) |
| `text` | TEXT | The question text |
| `options` | JSONB (nullable) | For MCQs: array of 4 answer options |
| `correct_answer` | TEXT (nullable) | For MCQs: the correct option |
| `marking_guidelines` | TEXT (nullable) | For subjective questions: hints for graders |

### 4.4 Attempt

**Table:** `attempts`

| Field | Type | Description |
|---|---|---|
| `id` | Integer (PK, auto) | Unique identifier |
| `exam` | FK → Exam | The exam being attempted |
| `student` | FK → User | The student attempting |
| `current_partition` | Integer | Which section the student is currently on |
| `start_time` | DateTime | When the attempt was started |
| `end_time` | DateTime (nullable) | When the attempt was completed |
| `score` | Integer (nullable) | Final score 0–100 (null until fully graded) |
| `is_completed` | Boolean | Whether the attempt has been submitted |
| `is_timeout` | Boolean | Whether the exam ended due to timer expiry |

### 4.5 AttemptAnswer

**Table:** `attempt_answers`

| Field | Type | Description |
|---|---|---|
| `id` | Integer (PK, auto) | Unique identifier |
| `attempt` | FK → Attempt | The attempt this answer belongs to |
| `question` | FK → Question | The question being answered |
| `answer` | TEXT | The student's answer text |
| `marks` | Integer (nullable) | Final marks assigned (null until graded) |
| `ai_suggested_marks` | Integer (nullable) | Marks suggested by AI grading |
| `ai_feedback` | TEXT (nullable) | AI-generated feedback for the answer |

---

## 5. Authentication System

PaperBot uses **Django's built-in session-based authentication**.

### How It Works

1. Student or teacher submits username + password to `POST /api/auth/login`
2. Django verifies credentials and creates a server-side session
3. A `sessionid` cookie is sent to the browser (HttpOnly, SameSite=Lax)
4. Every subsequent API request automatically includes this cookie
5. Django reads the cookie, looks up the session, and identifies the user

### Protection

- All API endpoints (except register and login) are protected by a custom `@require_auth` decorator
- If a request has no valid session, the API returns `401 Unauthorized`
- The frontend redirects unauthenticated users to the `/auth` login page

### Role-Based Access

- The `role` field (`teacher` or `student`) determines what data each user can see
- Teachers can create, edit, and delete exams and grade attempts
- Students can only see published exams and their own attempts
- Student-facing exam endpoints strip out correct answers before sending data

---

## 6. API Endpoints Reference

**Base URL:** `/api/`  
All endpoints require an active session cookie except `register` and `login`.

---

### 6.1 Authentication

#### `POST /api/auth/register`
Register a new user.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "secret123",
  "role": "student"
}
```

**Response (201):**
```json
{
  "id": 5,
  "username": "john_doe",
  "role": "student"
}
```

---

#### `POST /api/auth/login`
Log in and start a session.

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "secret123"
}
```

**Response (200):**
```json
{
  "id": 5,
  "username": "john_doe",
  "role": "student"
}
```

---

#### `POST /api/auth/logout`
End the current session.

**Response (200):**
```json
{ "message": "Logged out" }
```

---

#### `GET /api/auth/me`
Get the currently logged-in user.

**Response (200):**
```json
{
  "id": 5,
  "username": "john_doe",
  "role": "student"
}
```

---

### 6.2 Exams

#### `GET /api/exams`
List exams.
- **Teachers** see all their own exams (draft + published)
- **Students** see only published exams that have not expired

**Response (200):**
```json
[
  {
    "id": 1,
    "title": "Midterm Exam",
    "description": "Covers chapters 1-5",
    "durationMinutes": 60,
    "isPublished": true,
    "availableDays": 7,
    "publishedAt": "2026-03-01T10:00:00Z",
    "teacher": { "id": 2, "username": "prof_ali" },
    "questions": []
  }
]
```

---

#### `POST /api/exams`
Create a new exam (Teacher only).

**Request Body:**
```json
{
  "title": "Final Exam",
  "description": "Comprehensive final",
  "durationMinutes": 90,
  "availableDays": 5,
  "questions": [
    {
      "type": "mcq",
      "partition": 1,
      "text": "What is 2+2?",
      "options": ["2", "3", "4", "5"],
      "correctAnswer": "4"
    },
    {
      "type": "short",
      "partition": 2,
      "text": "Explain polymorphism.",
      "markingGuidelines": "Mention overriding and overloading"
    }
  ]
}
```

**Response (201):** Returns the created exam object.

---

#### `POST /api/exams/generate`
AI-generate exam questions from text or PDF (Teacher only).

**Request Body (text input):**
```json
{
  "text": "Paste your lecture notes or topic content here...",
  "numMcq": 5,
  "numShort": 3,
  "numLong": 1,
  "difficulty": "medium"
}
```

**Request Body (PDF upload):**  
Send as `multipart/form-data` with a `file` field containing the PDF file.

**Response (200):**
```json
{
  "title": "Generated Exam Title",
  "questions": [
    {
      "type": "mcq",
      "text": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "B"
    }
  ]
}
```

---

#### `GET /api/exams/<id>`
Get a specific exam's full details including questions.

---

#### `PATCH /api/exams/<id>`
Update exam details or replace questions (Teacher only).

---

#### `DELETE /api/exams/<id>`
Delete an exam and all its questions and student attempts (Teacher only).

---

#### `POST /api/exams/<id>/publish`
Publish an exam so students can see and attempt it (Teacher only).

**Response (200):**
```json
{
  "message": "Exam published",
  "publishedAt": "2026-03-10T08:00:00Z"
}
```

---

### 6.3 Attempts

#### `GET /api/attempts`
List attempts.
- **Teachers** see all attempts across all their exams
- **Students** see only their own attempts

---

#### `POST /api/attempts/start`
Start or resume an exam attempt (Student only).

**Request Body:**
```json
{ "examId": 3 }
```

**Response (201):** Returns the attempt object. If an incomplete attempt already exists for this exam, it returns that existing attempt instead of creating a new one.

---

#### `GET /api/attempts/<id>`
Get full details of an attempt including the exam, questions for the current partition (students) or all questions (teachers), and all recorded answers.

---

#### `POST /api/attempts/<id>/submit-partition`
Submit answers for the current section and advance to the next one.

**Request Body:**
```json
{
  "answers": [
    { "questionId": 12, "answer": "B" },
    { "questionId": 13, "answer": "My answer here..." }
  ],
  "isTimeout": false
}
```

**Behaviour:**
- Saves all provided answers for the current partition
- MCQ answers are auto-graded immediately (correct = 100, wrong = 0)
- Advances `currentPartition` to the next section
- If this was the last partition (or `isTimeout: true`), marks the attempt as complete
- Returns the updated attempt object

---

#### `POST /api/attempts/<id>/ai-grade`
Run AI grading on all subjective answers in an attempt (Teacher only).

**Response (200):** Returns all answers updated with `aiSuggestedMarks` and `aiFeedback`.

---

#### `POST /api/attempts/<id>/grade`
Save the teacher's final grades for an attempt (Teacher only).

**Request Body:**
```json
{
  "grades": [
    { "answerId": 45, "marks": 8 },
    { "answerId": 46, "marks": 5 }
  ]
}
```

**Response (200):** Returns the updated attempt with the recalculated final score.

---

## 7. Frontend Pages & Features

### 7.1 Auth Page

**Route:** `/auth`  
**File:** `client/src/pages/auth-page.tsx`  
**Accessible by:** Everyone (unauthenticated)

- Toggle between Login and Register forms
- Registration requires username, password, and role selection (Teacher / Student)
- Successful login redirects automatically to the appropriate role dashboard

---

### 7.2 Teacher Dashboard

**Route:** `/teacher`  
**File:** `client/src/pages/teacher-dashboard.tsx`  
**Accessible by:** Teachers only

- View all created exams with Draft / Published status badges
- Publish, View Details, Edit, or Delete any exam
- Sidebar showing the most recent student attempts across all exams with scores
- "Create New Exam" button as the primary action

---

### 7.3 Create / Edit Exam

**Routes:** `/teacher/exam/new` and `/teacher/exam/:id/edit`  
**File:** `client/src/pages/create-exam.tsx`  
**Accessible by:** Teachers only

**AI Generation tab:**
- Paste text content or upload a PDF file
- Select question counts (MCQ, Short Answer, Long Answer) and difficulty level
- AI generates a complete exam title and question set in seconds
- Teacher reviews and can adjust before saving

**Manual Builder tab:**
- Set exam title, description, duration (minutes), and availability window (days after publishing)
- Add questions one by one with type selection (MCQ / Short Answer / Long Answer)
- For MCQ: enter 4 options and mark the correct answer
- For Short/Long: enter marking guidelines for the teacher who grades
- Assign each question to a Part (1, 2, 3, or 4) for section-based delivery
- Remove questions from the list at any time

---

### 7.4 Exam Details (Teacher View)

**Route:** `/teacher/exam/:id`  
**File:** `client/src/pages/exam-details.tsx`  
**Accessible by:** Teachers only

- Exam metadata: total questions, duration, publish date, availability window
- Analytics: total attempt count, average score across all students
- Table of all student attempts showing student name, start time, score, and status
- Direct "Grade" link for each completed attempt

---

### 7.5 Grade Attempt

**Route:** `/teacher/attempt/:id/grade`  
**File:** `client/src/pages/grade-attempt.tsx`  
**Accessible by:** Teachers only

**AI Grading panel:**
- "Run AI Grading" button analyses all subjective answers at once
- AI returns a suggested mark (0–10 scale) and written feedback for each answer
- Teacher sees the student's answer alongside the marking guidelines

**Manual grading:**
- Each answer has a marks input field (teacher can override AI suggestions)
- Save all grades in one click
- Final score is recalculated and displayed in real time

---

### 7.6 Student Dashboard

**Route:** `/student`  
**File:** `client/src/pages/student-dashboard.tsx`  
**Accessible by:** Students only

**In Progress section:**
- Exams the student has started but not yet completed
- Shows current part number and a progress bar across all partitions
- "Resume Exam" button goes directly to the next unanswered section

**Available Exams section:**
- Published exams the student has not yet attempted
- Shows exam title, duration, number of parts, and closing deadline
- Deadline shown with urgency colour (red = closes very soon, yellow = closing soon)
- "Start Exam" button to begin

**Completed Results section:**
- All finished exams with final score percentage or "Pending" if subjective answers await grading
- "Review" link to see the result page for each attempt

**Expired Exams section:**
- Exams whose availability window has closed and can no longer be started

---

### 7.7 Exam Attempt

**Route:** `/student/attempt/:id`  
**File:** `client/src/pages/exam-attempt.tsx`  
**Accessible by:** Students only (their own attempts)

- **Part header:** "Part 1 of 3" with a segmented progress bar (green = done, blue = active, grey = upcoming)
- **Countdown timer:** Persistent at the top showing remaining exam time
- **MCQ questions:** Rendered as radio button option groups
- **Short/Long Answer questions:** Rendered as resizable text area inputs
- **Submit button:** Label changes based on position — "Submit Part 1", "Submit Part 2", "Submit Exam"
- **Break modal:** After submitting a non-final part, a modal offers two choices:
  - **Take a Break** → saves progress and returns to the student dashboard
  - **Continue** → immediately loads the next part without leaving the page

**Timer rules:**
- Timer runs continuously even when the student is on a break between parts
- If time runs out during an active session, the current part is auto-submitted and the exam ends
- If a student returns to the page after time has already expired, the exam is NOT auto-submitted — they must contact the teacher

---

### 7.8 Attempt Result

**Route:** `/student/result/:id`  
**File:** `client/src/pages/attempt-result.tsx`  
**Accessible by:** Students only (their own results)

- Final score displayed as a percentage with a trophy icon
- Pass/Fail indicator (passing threshold: 70%)
- "Pending Review" message if subjective answers have not yet been graded by the teacher
- Submission timestamp and whether it was a manual submission or an automatic timeout

---

## 8. AI Features

### 8.1 AI Question Generation

**File:** `api/openai_service.py`  
**Endpoint:** `POST /api/exams/generate`

The teacher provides source material and specifies:
- Number of MCQ questions
- Number of Short Answer questions
- Number of Long Answer questions
- Difficulty level: `easy`, `medium`, or `hard`

The system sends a structured prompt to GPT-4o requesting a JSON response containing an exam title and an array of questions. The result is validated and returned to the frontend for the teacher to review before saving.

**PDF support:** The server reads the uploaded PDF using `PyPDF2`, extracts the text, and includes it in the AI prompt. Only text-based PDFs are supported — scanned image PDFs will not work.

---

### 8.2 AI-Assisted Grading

**File:** `api/openai_service.py`  
**Endpoint:** `POST /api/attempts/<id>/ai-grade`

For each subjective answer (Short or Long), the AI receives:
- The question text
- The student's written answer
- The marking guidelines set by the teacher (if provided)

GPT-4o returns:
- A suggested mark out of 10
- Written feedback explaining the grade rationale

The teacher sees these suggestions alongside the real answers and can accept, adjust, or override each mark before saving the final grades.

---

## 9. Part-by-Part Exam Flow

Exams can be divided into up to **4 Partitions** (called Parts). Each question is assigned to a specific partition when the exam is created. Students see and answer only one part at a time.

### Flow Diagram

```
Student clicks "Start Exam"
        │
        ▼
POST /api/attempts/start
Creates new attempt with currentPartition = 1
        │
        ▼
Exam Attempt page loads
Shows only Part 1 questions
        │
Student answers all Part 1 questions
Clicks "Submit Part 1"
        │
        ▼
POST /api/attempts/:id/submit-partition
- Saves Part 1 answers to the database
- MCQ answers are auto-graded immediately
- currentPartition advances to 2
- If this was the last part → marks attempt as complete
        │
        ▼
Break Modal appears:
  ┌─────────────────┬─────────────────────┐
  │   Take a Break  │   Continue to Part 2│
  └─────────────────┴─────────────────────┘
          │                    │
          ▼                    ▼
   Redirected to          Part 2 questions
   dashboard              load immediately
   (timer continues)
          │
   Student clicks
   "Resume Exam"
          │
          ▼
   Part 2 loads (picks up where they left off)
          │
   ... repeat for each part ...
          │
          ▼
   Last part submitted
   Attempt marked complete
          │
          ▼
   Redirected to Result page
```

### Key Rules

- Students can only see questions for their **current partition** — future parts are hidden
- The overall exam timer runs continuously, even during breaks
- If the timer expires mid-attempt, the current part is submitted automatically with whatever answers were given
- Each partition's answers are saved independently to the database as they are submitted
- MCQ marks are calculated at the time each partition is submitted
- Subjective marks remain `null` until the teacher grades them manually

---

## 10. Local Development Setup

### Prerequisites

Install the following software before starting:

| Software | Version | Download |
|---|---|---|
| Python | 3.11+ | [python.org/downloads](https://python.org/downloads) |
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) |
| PostgreSQL | 14+ | [postgresql.org/download](https://postgresql.org/download) |

During **Python** installation on Windows: tick **"Add Python to PATH"**.  
During **PostgreSQL** installation: set a password for the `postgres` user and note it down.

---

### Step 1 — Open the Project in VS Code

Extract the downloaded ZIP file. Open VS Code and go to:
```
File → Open Folder → select the extracted project folder
```

---

### Step 2 — Create the Database

Open a terminal (inside VS Code or the system terminal) and run:
```bash
psql -U postgres
CREATE DATABASE paperbot;
\q
```

---

### Step 3 — Create the `.env` File

Create a new file called `.env` in the root of the project folder. Add the following:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/paperbot
SECRET_KEY=replace-with-any-long-random-string-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
AI_INTEGRATIONS_OPENAI_API_KEY=your-openai-api-key-here
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
```

Replace `YOUR_PASSWORD` with the PostgreSQL password you set during installation.  
The `SECRET_KEY` can be any long random text — for example: `paperbot-dev-secret-key-2026`.  
The OpenAI key is only needed for AI features; everything else works without it.

---

### Step 4 — Install Python Dependencies

In the VS Code terminal:
```bash
pip install -r requirements.txt
```

---

### Step 5 — Install Node.js Dependencies

```bash
npm install
```

---

### Step 6 — Run Database Migrations

```bash
python manage.py migrate
```

This creates all required tables in your PostgreSQL database.

---

### Step 7 — Create an Admin Account (Optional)

```bash
python manage.py createsuperuser
```

This creates a Django admin user. You can access the admin panel at `http://localhost:5000/admin/`.

---

### Step 8 — Run the Application

Open **two terminals** and run one command in each:

**Terminal 1 — Backend:**
```bash
python manage.py runserver 5000
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

Open your browser and go to: **`http://localhost:5173`**

The frontend (Vite) runs on port 5173 and the backend (Django) runs on port 5000. The frontend is configured to send API requests to port 5000 automatically.

---

## 11. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | Django secret key for cryptographic signing — keep this private |
| `DEBUG` | No | `True` for development, `False` for production |
| `ALLOWED_HOSTS` | Yes | Comma-separated list of allowed hostnames for the Django server |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | No* | OpenAI API key for AI question generation and AI grading |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | No* | OpenAI API base URL (default: `https://api.openai.com/v1`) |

*The AI features (question generation, AI grading) will not function without a valid OpenAI API key. All other features work normally.

---

## 12. Deployment on Replit

The production application is deployed as a **Replit Reserved VM**.  
Live URL: `https://paperbots.replit.app`

### Build Script — `build_prod.sh`

This script runs once when a new deployment is initiated:

1. Installs Python dependencies via `pip install -r requirements.txt`
2. Installs Node.js dependencies via `npm install`
3. Builds the React frontend via `npm run build` — outputs compiled files to `client/dist/`
4. Runs `pre_migrate.py` to safely handle migration state edge cases
5. Applies Django database migrations via `python manage.py migrate --fake-initial`

### Run Script — `run_prod.sh`

This script starts the production server:

1. Starts **Gunicorn** (production-grade WSGI server) bound to port 5000
2. Django serves both the REST API at `/api/...` routes and the compiled React app at all other routes

### Static Files in Production

In production, Django is configured to serve the compiled React build (`client/dist/index.html`) for any non-API URL. There is no separate Node.js server running in production.

### Custom Domain

To connect a custom domain (e.g., `paperbot.live`) instead of the default Replit subdomain:
1. Go to the **Deployments** tab in your Replit project
2. Click **Settings** → **Domains** → **Link a domain** or **Buy a domain**
3. Enter the domain name and follow the DNS configuration instructions provided
4. DNS propagation usually takes 10–30 minutes

---

## 13. Known Limitations & Notes

### Security (Development Configuration Only)
- Passwords are currently stored in plaintext. For a real production system, use Django's `make_password()` and `check_password()` with bcrypt hashing.
- CORS is open for all origins in development. Restrict `CORS_ALLOWED_ORIGINS` to specific domains in production.
- `DEBUG=True` must be changed to `DEBUG=False` in any real production environment.

### Exam Re-Attempts
- Each student can only attempt each exam **once**. Completed attempts cannot be retaken through the interface.
- If a student's attempt was erroneously completed (e.g., by a system error), the teacher must note it and handle it manually.

### Scoring Formula
- **MCQ questions**: Auto-graded at partition submission — correct answer = 100 points, wrong answer = 0 points
- **Subjective questions** (Short/Long Answer): Score is `null` (shown as "Pending") until the teacher assigns marks
- **Final score**: Average of all `marks` values across all graded answers in the attempt
- If any subjective answers remain ungraded, the attempt score stays `null` until all are graded

### AI Grading Quality
- AI grading suggestions are recommendations only — the teacher always makes the final marking decision
- The quality of AI suggestions improves significantly when the teacher provides detailed marking guidelines when creating the exam

### Timer Behaviour
- The exam countdown is based on `start_time` stored in the database, so closing the browser does not pause the timer
- Students cannot gain extra time by refreshing the page or re-opening the exam
- If a student's session expires (time runs out) while they are away, they are NOT auto-submitted on return — they see the current part but must contact the teacher if they need the attempt handled

### PDF Uploads for AI Generation
- Only **text-based PDFs** are supported (those created from Word documents, etc.)
- Scanned PDFs (photos of printed pages) do not contain selectable text and will not produce useful results
- Very large PDFs (more than a few MB) may take longer to process or may hit the AI token limit
