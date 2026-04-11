# Peru Mania Cup - Backend API

FastAPI-based tournament management system for osu! tournaments.

## Features

- **osu! OAuth Authentication** - Login via osu! account
- **Tournament Management** - Registration, brackets, matches
- **User Management** - Players and staff roles
- **Beatmap Pools** - Manage tournament maps
- **Match Tracking** - Score submission and results
- **Notifications** - Player notifications for matches

## Setup

### 1. Install Dependencies

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env` and update the values:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/pmc

# Frontend
FRONTEND_URL=http://localhost
FRONTEND_PORT=5173

# osu! OAuth (get from https://osu.ppy.sh/home/account/edit)
OSU_CLIENT_ID=your_client_id
OSU_CLIENT_SECRET=your_client_secret
OSU_REDIRECT_URI=http://localhost:8000/auth/callback

# JWT
SECRET_KEY=your-super-secret-key-change-in-production

# Debug
DEBUG=True
```

### 3. Set Up Database

```bash
# Create PostgreSQL database
createdb pmc

# Run migrations
alembic upgrade head
```

### 4. Run the Server

```bash
# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Project Structure

```
backend/
├── alembic/              # Database migrations
├── models/               # SQLAlchemy models
│   ├── user.py
│   ├── bracket.py
│   ├── match.py
│   ├── map.py
│   ├── tournament_state.py
│   ├── session.py
│   ├── audit_log.py
│   └── notification.py
├── routers/              # API endpoints
│   ├── auth.py           # OAuth flow
│   ├── users.py          # User management
│   ├── tournament.py     # Registration
│   ├── brackets.py       # Bracket management
│   ├── maps.py           # Map pool
│   ├── matches.py        # Match tracking
│   └── notifications.py  # User notifications
├── schemas/              # Pydantic models
│   └── auth.py
├── utils/                # Utilities
│   ├── auth.py           # JWT handling
│   ├── database.py       # DB session
│   └── osu_api.py        # osu! API client
├── config.py             # Configuration
├── main.py               # FastAPI app
└── .env                  # Environment variables
```

## API Endpoints

### Authentication
- `GET /auth/login` - Initiate osu! OAuth
- `GET /auth/callback` - OAuth callback
- `GET /auth/me` - Get current user
- `POST /auth/logout` - Logout

### Users
- `GET /users` - Get all users (staff)
- `GET /users/registered` - Get registered players
- `GET /users/{id}` - Get user details
- `PATCH /users/{id}/staff` - Update staff status (admin)

### Tournament
- `POST /tournament/register` - Register for tournament
- `DELETE /tournament/register` - Unregister
- `GET /tournament/registrations` - Get registration stats
- `GET /tournament/status` - Get tournament status

### Brackets
- `GET /brackets` - Get all brackets
- `POST /brackets` - Create bracket (staff)
- `GET /brackets/{id}` - Get bracket details
- `GET /brackets/{id}/matches` - Get bracket matches

### Maps
- `GET /maps` - Get all maps
- `POST /maps` - Add map (staff)
- `GET /maps/{id}` - Get map details
- `PATCH /maps/{id}` - Update map (staff)
- `DELETE /maps/{id}` - Delete map (staff)

### Matches
- `GET /matches` - Get matches (with filters)
- `POST /matches` - Create match (staff)
- `GET /matches/{id}` - Get match details
- `PATCH /matches/{id}/score` - Submit scores
- `PATCH /matches/{id}/complete` - Mark complete (staff)
- `DELETE /matches/{id}` - Delete match (staff)

### Notifications
- `GET /notifications` - Get user notifications
- `PATCH /notifications/{id}/read` - Mark as read
- `DELETE /notifications/{id}` - Delete notification

## Database Schema

See `document.md` for complete DBML schema.

Key tables:
- `users` - User accounts and registration status
- `tournament_state` - Global tournament state
- `brackets` - Tournament rounds (32, 16, 8, 4, 2)
- `maps` - Beatmap pool
- `matches` - Individual matches
- `sessions` - JWT sessions
- `audit_logs` - Staff action tracking
- `notifications` - User notifications

## Development

### Create New Migration

```bash
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Run Tests

```bash
pytest
```

## Deployment

See `document.md` for deployment checklist.

Key points:
- Use production database with backups
- Set strong SECRET_KEY
- Configure osu! OAuth callback URL
- Use HTTPS in production
- Set DEBUG=False
- Configure firewall rules

## License

MIT
