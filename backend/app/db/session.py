"""
Engine e sessão SQLAlchemy — persistência real das conversas (ver
app/db/models.py::ChatMessage). Antes disto, o histórico vivia só em memória
(_SESSIONS em app/chat/router.py) e perdia-se sempre que o backend
reiniciava; para uma plataforma que se quer usada a sério isso não chega.

SQLite é suficiente para um único servidor de desenvolvimento/MVP — trocar
DATABASE_URL por Postgres antes de escalar para múltiplas instâncias.
"""
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

_settings = get_settings()

# SQLite só permite o objeto de ligação ser usado na thread que o criou por
# omissão; o FastAPI corre cada pedido síncrono numa thread do threadpool,
# por isso isto é necessário para não rebentar com "SQLite objects created
# in a thread can only be used in that same thread".
_connect_args = {"check_same_thread": False} if _settings.database_url.startswith("sqlite") else {}

engine = create_engine(_settings.database_url, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
