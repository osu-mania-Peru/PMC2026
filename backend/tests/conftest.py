"""Test configuration and shared fixtures for bracket system tests."""
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models.base import Base
from models.user import User
from models.bracket import Bracket
from models.match import Match
from models.map import Map
from utils.database import get_db
from utils.auth import get_current_user, get_current_staff_user
from main import app


# --- Database fixtures ---

@pytest.fixture
def engine():
    """Create in-memory SQLite engine for testing."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # Disable FK enforcement to allow player_id=0 as "empty slot" sentinel.
    # ORM cascade handles relationship cleanup instead.
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=OFF")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db(engine) -> Session:
    """Create a fresh database session for each test."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


# --- User fixtures ---

@pytest.fixture
def staff_user(db: Session) -> User:
    """Create a staff user."""
    user = User(
        osu_id=1001,
        username="StaffUser",
        flag_code="PE",
        is_staff=True,
        is_registered=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def regular_user(db: Session) -> User:
    """Create a non-staff user."""
    user = User(
        osu_id=2001,
        username="RegularUser",
        flag_code="PE",
        is_staff=False,
        is_registered=True,
        seed_number=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def registered_players(db: Session) -> list[User]:
    """Create 8 registered players with seeds for bracket generation."""
    players = []
    for i in range(8):
        user = User(
            osu_id=3000 + i,
            username=f"Player{i + 1}",
            flag_code="PE",
            is_staff=False,
            is_registered=True,
            seed_number=i + 1,
        )
        db.add(user)
        players.append(user)
    db.commit()
    for p in players:
        db.refresh(p)
    return players


@pytest.fixture
def four_players(db: Session) -> list[User]:
    """Create 4 registered players for smaller bracket tests."""
    players = []
    for i in range(4):
        user = User(
            osu_id=4000 + i,
            username=f"SmallPlayer{i + 1}",
            flag_code="PE",
            is_staff=False,
            is_registered=True,
            seed_number=i + 1,
        )
        db.add(user)
        players.append(user)
    db.commit()
    for p in players:
        db.refresh(p)
    return players


# --- Map fixture ---

@pytest.fixture
def default_map(db: Session) -> Map:
    """Create a default map for matches."""
    m = Map(
        map_url="https://osu.ppy.sh/beatmaps/0",
        map_name="Test Song",
        difficulty_name="Normal",
        mapper_name="TestMapper",
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


# --- Bracket fixtures ---

@pytest.fixture
def winner_bracket(db: Session) -> Bracket:
    """Create a winner bracket."""
    bracket = Bracket(
        bracket_size=8,
        bracket_name="Winner Bracket",
        bracket_type="winner",
        bracket_order=1,
    )
    db.add(bracket)
    db.commit()
    db.refresh(bracket)
    return bracket


@pytest.fixture
def loser_bracket(db: Session) -> Bracket:
    """Create a loser bracket."""
    bracket = Bracket(
        bracket_size=8,
        bracket_name="Loser Bracket",
        bracket_type="loser",
        bracket_order=2,
    )
    db.add(bracket)
    db.commit()
    db.refresh(bracket)
    return bracket


@pytest.fixture
def gf_bracket(db: Session) -> Bracket:
    """Create a grand finals bracket."""
    bracket = Bracket(
        bracket_size=2,
        bracket_name="Grand Finals",
        bracket_type="grandfinals",
        bracket_order=3,
    )
    db.add(bracket)
    db.commit()
    db.refresh(bracket)
    return bracket


@pytest.fixture
def all_brackets(winner_bracket, loser_bracket, gf_bracket):
    """Return all three brackets for double elimination."""
    return {
        "winner": winner_bracket,
        "loser": loser_bracket,
        "grandfinals": gf_bracket,
    }


# --- Match fixtures ---

@pytest.fixture
def sample_match(db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]) -> Match:
    """Create a single scheduled match."""
    match = Match(
        bracket_id=winner_bracket.id,
        player1_id=registered_players[0].id,
        player2_id=registered_players[7].id,
        map_id=default_map.id,
        round_name="Round of 8",
        match_status="scheduled",
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@pytest.fixture
def completed_match(db: Session, winner_bracket: Bracket, default_map: Map, registered_players: list[User]) -> Match:
    """Create a completed match with winner."""
    match = Match(
        bracket_id=winner_bracket.id,
        player1_id=registered_players[0].id,
        player2_id=registered_players[7].id,
        map_id=default_map.id,
        round_name="Round of 8",
        match_status="completed",
        is_completed=True,
        player1_score=500000,
        player2_score=400000,
        winner_id=registered_players[0].id,
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@pytest.fixture
def match_chain(db: Session, winner_bracket: Bracket, loser_bracket: Bracket, default_map: Map, registered_players: list[User]):
    """Create a chain of matches: WR1 -> WR2, with loser path to LR1."""
    # Loser bracket match (destination for loser)
    lr1_match = Match(
        bracket_id=loser_bracket.id,
        player1_id=registered_players[4].id,
        player2_id=registered_players[5].id,
        map_id=default_map.id,
        round_name="Loser Round 1",
        match_status="scheduled",
    )
    db.add(lr1_match)
    db.commit()
    db.refresh(lr1_match)

    # Winner round 2 match (destination for winner)
    wr2_match = Match(
        bracket_id=winner_bracket.id,
        player1_id=registered_players[2].id,
        player2_id=registered_players[3].id,
        map_id=default_map.id,
        round_name="Winner Semifinals",
        match_status="scheduled",
    )
    db.add(wr2_match)
    db.commit()
    db.refresh(wr2_match)

    # Winner round 1 match (source) - links to both
    wr1_match = Match(
        bracket_id=winner_bracket.id,
        player1_id=registered_players[0].id,
        player2_id=registered_players[7].id,
        map_id=default_map.id,
        round_name="Round of 8",
        match_status="completed",
        is_completed=True,
        player1_score=500000,
        player2_score=400000,
        winner_id=registered_players[0].id,
        next_match_id=wr2_match.id,
        loser_next_match_id=lr1_match.id,
    )
    db.add(wr1_match)
    db.commit()
    db.refresh(wr1_match)

    return {"wr1": wr1_match, "wr2": wr2_match, "lr1": lr1_match}


@pytest.fixture
def gf_match_setup(db: Session, gf_bracket: Bracket, default_map: Map, registered_players: list[User]):
    """Create a grand finals match ready for bracket reset testing."""
    gf_match = Match(
        bracket_id=gf_bracket.id,
        player1_id=registered_players[0].id,
        player2_id=registered_players[1].id,
        map_id=default_map.id,
        round_name="Grand Finals",
        match_status="completed",
        is_completed=True,
        player1_score=400000,
        player2_score=500000,
        winner_id=registered_players[1].id,
    )
    db.add(gf_match)
    db.commit()
    db.refresh(gf_match)
    return gf_match


# --- FastAPI TestClient fixtures ---

@pytest.fixture
def client(db: Session, staff_user: User) -> TestClient:
    """Create a TestClient with DB and staff auth overrides."""
    def override_get_db():
        yield db

    def override_get_staff_user():
        return staff_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_staff_user] = override_get_staff_user
    app.dependency_overrides[get_current_user] = override_get_staff_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def public_client(db: Session) -> TestClient:
    """Create a TestClient with DB override only (no auth, for public endpoints)."""
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def unauth_client(db: Session, regular_user: User) -> TestClient:
    """Create a TestClient with non-staff auth (for permission tests)."""
    def override_get_db():
        yield db

    def override_get_user():
        return regular_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
