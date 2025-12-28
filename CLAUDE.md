# Claude Code Instructions

## Git Commits

When making commits:
- Include `Co-Authored-By: Claude <noreply@anthropic.com>` in commit messages
- Do NOT include the "Generated with Claude Code" badge or marketing text
- Follow existing commit style: imperative mood, concise descriptions

## Code Style

- Use Google-style docstrings for Python documentation
- Run `ruff check` and `pyright` before committing
- Generate docs with: `PYTHONPATH=/home/sharo/Desktop/projects/PMC/backend pdoc --output-dir docs/api config utils models services routers main`

## Project Structure

- Backend: FastAPI Python app in `/backend`
- Frontend: React app in `/frontend`
- Auth Service: Separate microservice in `/auth-service`
- Documentation: `/docs` (excluded from git)

## Sensitive Files

Never commit or expose:
- `.env` files (use `.env.example` as template)
- `*.db` database files
- API keys or secrets

## Security Notes

### Production API
- FastAPI docs are exposed (`/docs`, `/redoc`, `/openapi.json`) - consider disabling in production
- `/users/all` endpoint is public and marked "solo para testing" - should be protected or removed
- Other public endpoints: `/users/{id}`, `/tournament/*`, `/brackets`, `/maps`, `/matches`

### Before Production Launch
- Disable FastAPI docs: `app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)`
- Review public endpoints and add auth where needed
- Remove or protect testing endpoints like `/users/all`

## Frontend Deployment

When deploying the frontend to production:

1. **Before build**: Change API URLs from `api-staging` to `api`:
   - `frontend/.env`: `VITE_API_URL=https://api.perumaniacup.info`
   - `frontend/public/horse/index.html`: `const API_BASE = 'https://api.perumaniacup.info'`
   - `frontend/public/horse/index-clean.html`: same change

2. **Build and deploy**:
   ```bash
   ssh deploy@172.237.60.221 "cd ~/apps/PMC2026 && git pull && cd frontend && sed -i 's/api-staging/api/g' .env && npm run build"
   ```

3. **After deploy**: Revert API URLs back to `api-staging` in source files:
   - On VPS: `sed -i 's/api\.perumaniacup/api-staging.perumaniacup/g' .env`
   - Locally: revert `.env` and horse page files to `api-staging`

This ensures production uses the production API while local development uses staging.

## Known Issues

### Horse Racing Game (`/frontend/public/horse/`)
The horse racing mini-game at `/horse` route needs significant fixes:
- Camera/zoom behavior is broken
- Horse positioning and avatar overlay sync issues
- General game logic needs debugging
- Originally ported from `../umasim` project
