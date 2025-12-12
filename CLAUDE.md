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
