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
    # Ritual e resultado (Fase 8): intenção declarada pela pessoa antes da
    # chamada ("encontrar calma", "procurar orientação", texto livre) —
    # opcional, injetada no system prompt para o mentor a honrar.
    intention: str | None = None


class WelcomeIn(BaseModel):
    """Pedido de boas-vindas de reencontro (sessão existente)."""

    session_id: str


class WelcomeOut(BaseModel):
    """Boas-vindas geradas a partir da memória da sessão. reply=None significa
    que não há contexto suficiente (ou modo dev) — o frontend usa a saudação
    fixa nesse caso."""

    session_id: str
    reply: str | None = None
    audio_url: str | None = None


class ResponseSource(BaseModel):
    """Uma 'raiz' da resposta: excerto real das fontes públicas usado pelo RAG
    para fundamentar a resposta do mentor (painel 'Ver as raízes desta
    resposta' no frontend — camada de confiança, Fase 6)."""

    source_title: str
    excerpt: str


class ChatMessageOut(BaseModel):
    persona_id: str
    session_id: str
    reply: str
    disclaimer: str
    blocked: bool = False
    block_reason: str | None = None
    audio_url: str | None = None
    # Excertos que fundamentaram esta resposta. Lista vazia = resposta
    # interpretativa, sem excerto direto recuperado (o frontend sinaliza-o).
    sources: list[ResponseSource] = []
    # Segurança de crise (Fase 7): quando a mensagem do utilizador contém
    # sinais de autolesão/crise, a interface mostra este aviso com linhas de
    # apoio reais — gerado no backend, nunca dependente do texto do modelo.
    safety_notice: str | None = None


class ChatHistoryTurn(BaseModel):
    role: str
    content: str


class ChatHistoryOut(BaseModel):
    session_id: str
    messages: list[ChatHistoryTurn]
