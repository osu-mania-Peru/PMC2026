<p align="center">
  <img src="assets/logo.svg" alt="PMC" width="128">
</p>

<h1 align="center">Peru Mania Cup 2026</h1>

<p align="center">
  Official website for PMC 2026, an osu!mania tournament.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#setup">Setup</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## Features

- **Player Registration** — osu! OAuth login
- **Mappool Showcase** — Beatmaps organized by round and mod
- **Brackets** — Double elimination with loser's bracket
- **Match Schedule** — Timeline view with referee info
- **Staff Panel** — Whitelist and Discord integration

## Architecture

```
PMC/
├── backend/          # FastAPI + PostgreSQL
│   ├── routers/      # API endpoints
│   ├── models/       # SQLAlchemy models
│   ├── services/     # Business logic
│   └── schemas/      # Pydantic schemas
├── frontend/         # React + Vite
│   ├── src/pages/    # Page components
│   └── public/       # Static assets
└── auth-service/     # osu! OAuth (see MiauAuth)
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, Lucide Icons |
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| Auth | osu! OAuth via [MiauAuth](https://github.com/kitasenbei/MiauAuth) |
| Deploy | Docker, Nginx |

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python main.py
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Auth Service
See [MiauAuth](https://github.com/kitasenbei/MiauAuth) for standalone osu! authentication.

## API Endpoints

| Route | Description |
|-------|-------------|
| `/users` | Player registration and profiles |
| `/tournament` | Tournament settings and info |
| `/brackets` | Bracket generation and management |
| `/mappool` | Mappool CRUD operations |
| `/matches` | Match scheduling and results |
| `/maps` | Beatmap data and metadata |

## Deployment

```bash
docker-compose up -d
```

Or deploy services individually:

```bash
# Backend
cd backend && docker build -t pmc-backend .

# Frontend
cd frontend && npm run build
# Serve dist/ with nginx
```

## License

MIT
