# ARIZE (AI Arena)

ARIZE is a React + Django fitness platform with AI-assisted workout, nutrition, analytics, shopping, and integrations.

## Current Features

- Authentication: email/password + Google login, JWT session flow
- User Hub dashboard: profile setup, notifications, progress photo upload
- Today Workout Plan: local task persistence, add/remove/toggle tasks, return reminder toast
- Computer Vision workout tracking: rep/session analysis + uploaded workout video analysis
- Nutrition Intelligence: food search, Groq-backed calorie search, image-based recognition flow
- AI Brain chat: contextual coaching with recommendation support
- Analytics: consistency analytics + district streak leaderboard
- Shopping: suggestions, chat, Wikipedia product search, cart operations
- Integrations: fitness bands, WhatsApp trigger, music recommendation with resilient fallback behavior

## Tech Stack

- Frontend: React 19, Vite, React Router, Framer Motion, Recharts
- Backend: Django 5, DRF, SimpleJWT, CORS
- AI/LLM: Groq, LangChain, LangGraph
- Vision/Nutrition: Gemini integration support + MediaPipe/OpenCV pipeline hooks
- Optional microservice: FastAPI AI service

## Repository Structure

- frontend/: React + Vite frontend
- backend/: Django REST backend
- fastapi_service/: optional FastAPI service

## Quick Start

### 1) Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Default frontend: http://localhost:5173

### 2) Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
cd backend
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Backend API base URL: http://localhost:8000/api

### 3) Optional FastAPI Service

```bash
pip install -r fastapi_service/requirements.txt
python -m uvicorn fastapi_service.main:app --host 0.0.0.0 --port 9000
```

FastAPI base URL: http://localhost:9000

## Frontend Routes

- /: Landing
- /login, /register
- /dashboard
- /vision
- /nutrition
- /analytics
- /chat
- /integrations
- /counter
- /shopping-cart

Note: all routes except landing/login/register are protected in frontend routing.

## Backend API Endpoints (Core)

### Auth / Profile

- POST /api/auth/signup/
- POST /api/auth/login/
- POST /api/auth/google/
- POST /api/auth/token/refresh/
- GET/PUT /api/profile/

### Dashboard / Workouts / CV

- GET /api/dashboard/summary/
- GET /api/dashboard/progress/
- GET/POST /api/workouts/sessions/
- POST /api/workouts/cv/analyze/
- POST /api/workouts/video/analyze/
- GET /api/workouts/summary/

### Nutrition

- POST /api/nutrition/recognize/
- POST /api/nutrition/search/
- POST /api/nutrition/search/groq/
- GET /api/nutrition/logs/

### Analytics

- GET /api/analytics/consistency/
- GET /api/analytics/streak-leaderboard/
- GET /api/analytics/overview/

### AI / Recommendations

- GET/POST /api/rag/memory/
- POST /api/chat/ask/
- POST /api/recommendations/workout/

### Integrations

- GET/POST /api/sleep/logs/
- GET/POST /api/integrations/bands/sync/
- POST /api/integrations/whatsapp/send/
- POST /api/music/recommend/

### Shopping

- POST /api/shopping/suggestions/
- GET /api/shopping/wikipedia/search/
- POST /api/shopping/chat/
- GET /api/shopping/cart/
- DELETE /api/shopping/cart/
- POST /api/shopping/cart/add/
- DELETE /api/shopping/cart/item/<item_id>/
- PUT /api/shopping/cart/item/<item_id>/update/

### Other

- GET /api/features/
- GET /api/health/
- GET/POST /api/progress/photos/
- GET/PUT /api/notifications/preferences/

## FastAPI Endpoints

- GET /health
- POST /cv/analyze
- POST /nutrition/recognize
- POST /chat/respond
- POST /recommendation/workout

## Environment Variables

Frontend envs (from frontend/.env.example):

- VITE_API_BASE_URL
- VITE_GOOGLE_CLIENT_ID
- VITE_SPOTIFY_CLIENT_ID
- VITE_YOUTUBE_API_KEY

Backend envs (from backend/.env.example):

- DJANGO_SECRET_KEY, DJANGO_DEBUG, DJANGO_ALLOWED_HOSTS
- CORS_ALLOWED_ORIGINS
- FASTAPI_SERVICE_URL
- GROQ_API_KEY
- LANGCHAIN_* and LANGGRAPH_* settings
- GYMNASIUM_ANALYSIS_ENABLED
- GEMINI / nutrition / integration keys (as configured)
- YOUTUBE_API_KEY

## Notes

- For LAN testing, run frontend and backend on 0.0.0.0 and use the machine IP in browser.
- If external APIs are unavailable, several frontend modules now include graceful fallback behavior.
