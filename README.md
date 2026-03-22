# ARIZE (AI Arena)

ARIZE is an AI-powered fitness platform built with React, Django, and FastAPI.
It combines workout tracking, nutrition analysis, AI coaching, analytics, shopping recommendations, and integrations in one app.

## Features

### User & Auth
- Email/password signup + login
- Google login flow
- JWT access + refresh token session
- Onboarding quiz and protected app shell

### Dashboard & Progress
- Daily summary cards (reps, calories, streak, completion)
- Workout task planner with local persistence
- Progress photo upload and gallery view
- Notification preferences and profile settings

### Workout & Computer Vision
- Real-time rep counter page
- CV workout analysis endpoint
- Video workout upload + analysis
- Workout summary and session logs

### Nutrition Intelligence
- Food name to calories/macros estimate
- Food image recognition for nutrition values
- Nutrition logs and daily macro tracking

### AI Assistant & Recommendations
- AI chat coach
- RAG memory endpoints
- Workout recommendation engine

### Integrations & Extras
- Fitness band sync endpoints
- Sleep logs
- WhatsApp integration endpoint
- Music recommendation panel

### Shopping AI
- AI shopping chat
- Product discovery (Wikipedia/product links)
- Cart add/update/delete flow

## Tech Stack

- Frontend: React 19, Vite, React Router, Framer Motion
- Backend: Django 5, Django REST Framework, SimpleJWT
- AI stack: Groq, LangChain, LangGraph, Gemini integration hooks
- CV stack: MediaPipe/OpenCV integration hooks
- Optional service: FastAPI microservice

## Repository Structure

- `frontend/` React + Vite app
- `backend/` Django API
- `fastapi_service/` FastAPI service
- `DEPLOYMENT.md` deployment guide (free-tier friendly)

## How to Start (Local Development)

### 1) Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at `http://localhost:5173`.

### 2) Django Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
cd backend
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Backend runs at `http://localhost:8000/api`.

### 3) FastAPI Service (Optional but recommended)

```bash
source .venv/bin/activate
pip install -r fastapi_service/requirements.txt
cp fastapi_service/.env.example fastapi_service/.env
python -m uvicorn fastapi_service.main:app --host 0.0.0.0 --port 9000
```

FastAPI runs at `http://localhost:9000`.

## Main Frontend Routes

- `/`
- `/login`, `/register`
- `/onboarding`
- `/dashboard`
- `/counter`
- `/vision`
- `/nutrition`
- `/chat`
- `/analytics`
- `/integrations`
- `/gallery`
- `/shopping-cart`
- `/settings`

## Core API Surface (Django)

- Auth: `/api/auth/*`
- Profile: `/api/profile/`
- Dashboard: `/api/dashboard/*`
- Workouts/CV: `/api/workouts/*`
- Nutrition: `/api/nutrition/*`
- Analytics: `/api/analytics/*`
- AI/Recommendations: `/api/chat/ask/`, `/api/recommendations/workout/`, `/api/rag/memory/`
- Integrations: `/api/integrations/*`, `/api/music/recommend/`, `/api/sleep/logs/`
- Shopping: `/api/shopping/*`
- System: `/api/health/`, `/api/features/`


## Contributing Rules

Please follow [CONTRIBUTING.md](CONTRIBUTING.md).

Quick rules:
- Keep changes scoped to the requested feature/bug.
- Do not break existing API contracts or route names without migration notes.
- Add or update docs when behavior changes.
- Run frontend build/tests and backend checks before opening PR.
- Prefer small, reviewable PRs with clear commit messages.
