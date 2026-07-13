import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.avatar.router import router as avatar_router
from app.chat.router import router as chat_router
from app.core.config import get_settings
from app.db.models import Base
from app.db.session import engine
from app.personas.router import router as personas_router
from app.takedown.router import router as takedown_router

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description=(
        "API da plataforma de Mentores de IA. Todas as respostas de chat "
        "passam por app/core/guardrails.py — ver docs/LEGAL-GUARDRAILS.md."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(personas_router)
app.include_router(chat_router)
app.include_router(avatar_router)
app.include_router(takedown_router)

# Cria as tabelas (ex. chat_messages) se ainda não existirem — sem
# necessidade de Alembic para o volume/estágio atual do MVP.
Base.metadata.create_all(bind=engine)

# Áudio TTS das respostas dos mentores (app/chat/router.py::criar_audio).
os.makedirs("static/audio", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}
