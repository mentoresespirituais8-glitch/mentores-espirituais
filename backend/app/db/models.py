from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ChatMessage(Base):
    """Uma mensagem (do utilizador ou do mentor) numa conversa. session_id é o
    mesmo identificador devolvido em ChatMessageOut e usado por
    GET /chat/session/{session_id} para restaurar a conversa no frontend
    (ver PersonaCall.tsx)."""

    __tablename__ = "chat_messages"
    __table_args__ = (Index("ix_chat_messages_session_id_id", "session_id", "id"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class SessionMemory(Base):
    """Resumo persistido do que o mentor 'recorda' de uma sessão longa.

    Em vez de reenviar o histórico completo ao modelo (contexto a crescer sem
    limite), as mensagens mais antigas são condensadas neste resumo, que é
    injetado no system prompt (ver app/chat/memory.py e
    app/core/guardrails.py::build_system_prompt). `covered_messages` marca
    quantas mensagens do histórico já estão representadas no resumo.
    """

    __tablename__ = "session_memories"

    session_id: Mapped[str] = mapped_column(String, primary_key=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    covered_messages: Mapped[int] = mapped_column(nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
