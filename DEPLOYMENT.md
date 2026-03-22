# Deployment Guide (Free Tier)

This repository is configured for **3 services**:

1. **Frontend (React/Vite)** on Vercel
2. **Backend API (Django)** on Render
3. **AI Service (FastAPI)** on Render

---

## 1) Frontend (Vercel)

- Project root: `frontend/`
- Build command: `npm run build`
- Output directory: `dist`
- SPA routing: handled by `frontend/vercel.json`

Set environment variables in Vercel:

- `VITE_API_BASE_URL=https://<django-service>.onrender.com/api`
- `VITE_GOOGLE_CLIENT_ID=<optional>`
- `VITE_SPOTIFY_CLIENT_ID=<optional>`
- `VITE_YOUTUBE_API_KEY=<optional>`

---

## 2) Django API (Render)

`render.yaml` already contains service scaffolding for Django.

Required env vars in Render:

- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG=0`
- `DJANGO_ALLOWED_HOSTS=<django-service>.onrender.com`
- `CORS_ALLOWED_ORIGINS=https://<frontend>.vercel.app`
- `CSRF_TRUSTED_ORIGINS=https://<frontend>.vercel.app`
- `DATABASE_URL=<postgres-connection-url>`
- `FASTAPI_SERVICE_URL=https://<fastapi-service>.onrender.com`
- AI provider keys used by your app (`GROQ_API_KEY`, etc.)

Notes:

- Static files are served via WhiteNoise.
- Start command runs migrations automatically.

---

## 3) FastAPI Service (Render)

`render.yaml` includes FastAPI service scaffolding.

Required env vars:

- `FASTAPI_CORS_ORIGINS=https://<frontend>.vercel.app`

---

## 4) Database

For production, use managed Postgres (Neon/Supabase/Render Postgres).

- Put Postgres URL in `DATABASE_URL`.
- SQLite is not recommended for production hosting.

---

## 5) Deployment Order

1. Deploy Django (get URL)
2. Deploy FastAPI (get URL)
3. Set `FASTAPI_SERVICE_URL` in Django and redeploy Django
4. Deploy frontend with `VITE_API_BASE_URL` set to Django URL
5. Verify CORS + CSRF origins

---

## 6) Health Checks

- Django: `https://<django-service>.onrender.com/api/health/`
- FastAPI: `https://<fastapi-service>.onrender.com/health`

If both are healthy and frontend env vars are correct, app is deployment-ready.
