from pydantic import BaseModel

from app.personas.models import AvatarConfig, PersonaStatus


class PersonaSummary(BaseModel):
    """O que a listagem pública devolve — nunca o dossiê de fontes completo."""

    id: str
    slug: str
    display_name: str
    inspired_by: list[str]
    tagline: str
    status: PersonaStatus
    avatar: AvatarConfig
    topics: list[str]


class ChatMessageIn(BaseModel):
    message: str
    session_id: str | None = None


class ChatMessageOut(BaseModel):
    persona_id: str
    session_id: str
    reply: str
    disclaimer: str
    blocked: bool = False
    block_reason: str | None = None
    audio_url: str | None = None


class ChatHistoryTurn(BaseModel):
    role: str
    content: str


class ChatHistoryOut(BaseModel):
    session_id: str
    messages: list[ChatHistoryTurn]
