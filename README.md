# BeastTrack

BeastTrack is a React + Django fitness platform scaffold covering:

- User auth + profile setup
- CV workout tracking (OpenCV/MediaPipe-ready)
- Food recognition + nutrition AI module
- Streak, consistency, and analytics dashboards
- Fitness band sync, WhatsApp bot, shopping, and music integration pages
- RAG-style personal intelligence + AI chatbot + recommendation engine

## Project Structure

- `src/` → React frontend (Vite)
- `backend/` → Django REST backend
- `fastapi_service/` → FastAPI AI microservice

## Frontend Setup (React)

1. Install dependencies:

	```bash
	npm install
	```

2. Create env:

	```bash
	cp .env.example .env
	```

3. Run frontend:

	```bash
	npm run dev
	```

## Backend Setup (Django)

1. Create Python virtual environment and activate it.

2. Install dependencies:

	```bash
	pip install -r backend/requirements.txt
	```

3. Create backend env:

	```bash
	cp backend/.env.example backend/.env
	```

4. Run migrations:

	```bash
	cd backend
	python manage.py migrate
	```

5. Start backend:

	```bash
	python manage.py runserver
	```

Backend API base URL: `http://localhost:8000/api`

## AI Service Setup (FastAPI)

1. Install AI service dependencies:

	```bash
	pip install -r fastapi_service/requirements.txt
	```

2. Start FastAPI service:

	```bash
	python -m uvicorn fastapi_service.main:app --host 0.0.0.0 --port 9000
	```

FastAPI base URL: `http://localhost:9000`

## Key API Endpoints

- `POST /api/auth/signup/`
- `POST /api/auth/login/`
- `POST /api/auth/google/`
- `POST /api/auth/token/refresh/`
- `GET/PUT /api/profile/`
- `GET /api/dashboard/summary/`
- `GET /api/dashboard/progress/`
- `GET/POST /api/workouts/sessions/`
- `POST /api/workouts/cv/analyze/`
- `GET /api/workouts/summary/`
- `POST /api/nutrition/recognize/`
- `GET /api/analytics/consistency/`
- `GET /api/analytics/overview/`
- `GET/POST /api/sleep/logs/`
- `GET/POST /api/integrations/bands/sync/`
- `GET/POST /api/rag/memory/`
- `POST /api/chat/ask/`
- `POST /api/recommendations/workout/`
- `POST /api/integrations/whatsapp/send/`
- `POST /api/shopping/suggestions/`
- `POST /api/music/recommend/`
- `GET/POST /api/progress/photos/`
- `GET/PUT /api/notifications/preferences/`
- `GET /api/nutrition/logs/`
- `POST /api/nutrition/search/`
- `GET /api/features/`

### FastAPI AI Endpoints

- `GET /health`
- `POST /cv/analyze`
- `POST /nutrition/recognize`
- `POST /chat/respond`
- `POST /recommendation/workout`

## Environment Variables

Frontend envs are in `.env.example`.

Backend envs are in `backend/.env.example`, including placeholders for:

- OpenAI / embeddings (RAG)
- Nutrition APIs
- Google Fit / Fitbit
- Twilio WhatsApp
- Shopify
- Spotify / YouTube

Also set:

- `FASTAPI_SERVICE_URL=http://localhost:9000`
