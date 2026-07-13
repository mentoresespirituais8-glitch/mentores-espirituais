from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class PersonaStatus(str, Enum):
    PUBLICO = "publico"
    LICENCIADO = "licenciado"
    SUSPENSO = "suspenso"


class AvatarStyle(str, Enum):
    ILUSTRACAO_ABSTRATA = "ilustracao-abstrata"
    AVATAR_3D_GENERICO = "avatar-3d-generico"
    INICIAIS_TIPOGRAFICAS = "iniciais-tipograficas"
    # Ilustração gerada por IA com aspeto humano/fotorealista, mas que NÃO
    # pretende ser uma reprodução exata da aparência real da pessoa — usada
    # só para figuras históricas falecidas há muito tempo, nunca para
    # pessoas vivas (regra 6). Ver docs/LEGAL-GUARDRAILS.md.
    RETRATO_FICTICIO_REALISTA = "retrato-ficticio-realista"
    FOTO_REALISTA = "foto-realista"  # só permitido com status LICENCIADO — reprodução real da pessoa


class Source(BaseModel):
    title: str
    type: str  # ex: "discurso_publico", "entrevista_publica", "livro", "artigo"
    reference: str


class AvatarConfig(BaseModel):
    style: AvatarStyle
    asset: str
    voice_provider: str = "generic-tts"
    voice_id: str = "pt-PT-neutral-01"
    # Único parâmetro de entrega que o TTS genérico (gTTS) permite variar por
    # persona sem custo — voz distinta por figura exigiria um fornecedor
    # pago (ver voice_id acima, ainda por ligar). Baseado no TOM DE VOZ já
    # descrito em system_prompt_notes de cada persona.
    speaking_pace: str = "normal"  # "normal" | "lenta"


class SourceExcerpt(BaseModel):
    """Um excerto recuperado do RAG para fundamentar uma resposta."""

    source_title: str
    text: str
    persona_id: str | None = None


class Persona(BaseModel):
    """Persona individual (regra 1, 3, 5, 6, 7)."""

    id: str
    slug: str
    display_name: str
    inspired_by: list[str]
    tagline: str
    status: PersonaStatus = PersonaStatus.PUBLICO
    owner_org: str | None = None
    avatar: AvatarConfig
    topics: list[str] = Field(default_factory=list)
    sources: list[Source] = Field(default_factory=list)
    system_prompt_notes: str = ""
    # Blocos de conhecimento extraídos das fontes públicas. Em produção isto
    # vive num vector store (ver docs/LEGAL-GUARDRAILS.md); para o MVP são
    # pesquisados por palavra-chave em app/personas/service.py.
    knowledge_chunks: list["SourceExcerpt"] = Field(default_factory=list)

    @field_validator("sources")
    @classmethod
    def min_two_public_sources(cls, sources: list[Source]) -> list[Source]:
        if len(sources) < 2:
            raise ValueError(
                "Uma persona precisa de pelo menos 2 fontes públicas antes de "
                "poder ser publicada (ver docs/LEGAL-GUARDRAILS.md)."
            )
        return sources

    @field_validator("avatar")
    @classmethod
    def foto_realista_requires_license(cls, avatar: AvatarConfig, info):
        status = info.data.get("status")
        if avatar.style == AvatarStyle.FOTO_REALISTA and status != PersonaStatus.LICENCIADO:
            raise ValueError(
                "avatar.style 'foto-realista' só é permitido para personas "
                "com status 'licenciado' (regra 6)."
            )
        return avatar


class MentorSynthesis(BaseModel):
    """Mentor combinado — múltiplas personas-fonte (regra sobre Mentores de IA)."""

    id: str
    slug: str
    display_name: str
    source_persona_ids: list[str]
    synthesis_prompt_notes: str = ""
    status: PersonaStatus = PersonaStatus.PUBLICO
    avatar_asset: str | None = None

    @field_validator("source_persona_ids")
    @classmethod
    def at_least_two_sources(cls, ids: list[str]) -> list[str]:
        if len(ids) < 2:
            raise ValueError("Um Mentor sintetizado precisa de pelo menos 2 personas-fonte.")
        return ids
