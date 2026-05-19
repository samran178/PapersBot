# PaperBot: Automated Exam Management & Assessment Platform

PaperBot is a production-grade, web-based exam management ecosystem engineered specifically for the University of Gujrat. It streamlines the lifecycle of academic evaluations by enabling educators to architect dynamic examinations and empowering students to securely execute assessments online. 

The system leverages artificial intelligence to parse instructional content, generate contextual question sets, and provide automated grading suggestions for subjective responses.

*Developed as part of a Final Year Project (FYP) by Samran Taimoor & Arzoo Fatima.*

🔗 **Production URL:** [https://papersbot.com](https://papersbot.com)

---

## 🚀 Core Features

### 👨‍🏫 Faculty Dashboard (Teacher Side)
* **Dynamic Exam Composition:** Author exams featuring multiple question types, including multiple-choice questions (MCQs), short answers, and long subjective essays.
* **AI-Assisted Question Generation:** Instantly extract text from uploaded resource PDFs or raw lecture notes to automatically generate balanced exam questions using generative AI.
* **Granular Lifecycle Controls:** Manage exam visibility states via instant Publish/Unpublish protocols accompanied by validation checks.
* **Hybrid Grading Suite:** Access automated grading suggestion vectors alongside manually controlled overrides for subjective student answers.

### 🎓 Student Interface
* **Context-Aware Exam Feed:** Browse open, pending, and published evaluations marked with deadlining indicators and availability thresholds.
* **Time-Constrained Testing Environment:** Execute exams inside a secure interface backed by persistent server-side countdown timers.
* **Segmented Workspaces:** Clear visual separation of multi-partition exam papers divided into structured Section boundaries (A/B/C/D).
* **Instant Performance Feedback:** View auto-graded metric charts immediately upon submitting objective examination blocks.

---

## 🛠️ Architecture & System Migration

Originally designed on a decoupled runtime, the platform's backend was completely migrated from Node.js/Express to **Python 5.x/Django** to smoothly interface with the broader enterprise PostgreSQL and machine learning stack. 

* **Frontend Engine:** React.js, Vite, TypeScript, TanStack React Query, Tailwind CSS, shadcn/ui.
* **Backend Architecture:** Python, Django 5.x (Functional View Architecture).
* **Database Layer:** PostgreSQL (JSONB relational storage mapping).
* **AI Core:** OpenAI API Wrapper (GPT-4o optimization protocols), `pypdf` ingestion pipelines.

---

## 📂 System File Layout

```text
├── api/
│   ├── models.py           # Django ORM PostgreSQL database schemas
│   ├── views.py            # Restive API controller functions & validation business logic
│   ├── urls.py             # Routed endpoint maps for app-specific paths
│   └── openai_service.py   # Large Language Model prompts, orchestration, and PDF processing
├── paperbot/
│   ├── settings.py         # Global Django environmental configurations & middleware rules
│   └── urls.py             # Master URL router serving APIs and compiling the SPA frontend
├── dist/public/            # Optimized, static production builds compiled from React
├── manage.py               # Native Django management and CLI controller module
└── run.sh                  # Automation script bundling compilation and database migrations
