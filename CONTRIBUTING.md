# Contributing to ARIZE

Thanks for contributing.

## Ground Rules

- Keep PRs focused: one feature/fix per PR.
- Preserve existing functionality unless the PR explicitly changes it.
- Avoid unrelated refactors in feature PRs.
- Keep UI consistent with the current design system.

## Branch & Commit

- Branch naming:
  - `feat/<short-description>`
  - `fix/<short-description>`
  - `docs/<short-description>`
- Commit style:
  - `feat: add nutrition image KPI cards`
  - `fix: prevent null cart item quantity`
  - `docs: update deployment env vars`

## Local Validation Before PR

### Frontend

```bash
cd frontend
npm install
npm run build
```

### Backend (Django)

```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python manage.py check
python manage.py migrate
```

### FastAPI (if touched)

```bash
source .venv/bin/activate
pip install -r fastapi_service/requirements.txt
python -m uvicorn fastapi_service.main:app --host 0.0.0.0 --port 9000
```

## Pull Request Checklist

- [ ] Problem statement is clear.
- [ ] Scope is minimal and targeted.
- [ ] Backward compatibility considered (routes, payloads, env vars).
- [ ] README/DEPLOYMENT docs updated when needed.
- [ ] Build/checks pass locally.
- [ ] Screenshots included for UI changes.

## Code Style

- Follow existing naming and file structure.
- Prefer readable code over clever code.
- Keep component props and API payloads explicit.
- Avoid introducing new dependencies unless necessary.

## Security & Secrets

- Never commit real API keys, tokens, or secrets.
- Use `.env` and `.env.example` for configuration.
- For production, always set `DJANGO_DEBUG=0` and valid hosts/origins.
