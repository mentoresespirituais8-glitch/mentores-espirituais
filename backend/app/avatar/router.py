"""
Integração de avatar animado com lip-sync (nível 2 do roadmap).

Ainda não há fornecedor escolhido. Candidatos avaliados para o próximo passo:
- D-ID (https://www.d-id.com) — avatar de imagem estática + lip-sync, TTS incluído.
- HeyGen Avatar API — avatares mais realistas, mais caro.
- Simli — focado em avatares em tempo real para conversação.

Este router expõe já o contrato de API que o frontend vai consumir, para que
a integração real possa ser trocada sem mexer no frontend: dado um texto de
resposta, devolve um URL de vídeo/stream com o avatar a "falar" esse texto.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import get_settings
from app.personas import service

router = APIRouter(prefix="/avatar", tags=["avatar"])


class AvatarRenderRequest(BaseModel):
    persona_id: str
    text: str


class AvatarRenderResponse(BaseModel):
    persona_id: str
    # Em modo stub, devolve None — o frontend cai automaticamente para o
    # fallback de áudio/legenda (ver frontend/src/pages/PersonaCall.tsx).
    video_url: str | None
    provider: str


@router.post("/render", response_model=AvatarRenderResponse)
def render_avatar_speech(payload: AvatarRenderRequest) -> AvatarRenderResponse:
    persona = service.get_persona(payload.persona_id)
    if persona is None:
        raise HTTPException(status_code=404, detail="Persona não encontrada")

    settings = get_settings()
    if not settings.avatar_provider or not settings.avatar_api_key:
        return AvatarRenderResponse(
            persona_id=payload.persona_id, video_url=None, provider="stub"
        )

    # TODO: chamar o fornecedor escolhido (D-ID/HeyGen/Simli) usando
    # persona.avatar.voice_id e settings.avatar_api_key, devolver o URL do
    # vídeo/stream resultante.
    raise NotImplementedError(
        f"Integração com fornecedor '{settings.avatar_provider}' ainda não implementada."
    )
