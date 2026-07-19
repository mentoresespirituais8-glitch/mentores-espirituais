"""
Camada de síntese de voz multiprovedor (Bloco A das melhorias, 2026-07-19).

O fornecedor é escolhido pela variável de ambiente TTS_PROVIDER:
  - "edge" (predefinido): vozes neurais gratuitas do serviço online do
    Microsoft Edge (via biblioteca edge-tts). Qualidade próxima de TTS pago,
    com vozes pt-PT reais (Duarte/Raquel) e perfil próprio por mentor.
    Nota: serviço não-oficial — adequado à fase experimental; por isso o
    fallback abaixo nunca é removido (decisão registada no CLAUDE.md).
  - "gtts": Google Translate TTS — robótico mas estável; é também o fallback
    automático sempre que o fornecedor principal falhar.

Regra de ouro: a voz NUNCA bloqueia a resposta de texto. Qualquer falha aqui
devolve None e o chat segue sem áudio (o frontend já lida com audio_url null).

Futuro (quando houver orçamento): acrescentar um ramo "elevenlabs"/"azure"
nesta mesma função — mais nada no projeto precisa de mudar.
"""
from __future__ import annotations

import asyncio
import os
import time
import uuid
from dataclasses import dataclass

_AUDIO_DIR = os.path.join("static", "audio")
_AUDIO_MAX_AGE_SECONDS = 3600
# Proteção de consumo: respostas dos mentores têm 3-6 frases; isto chega para
# qualquer resposta legítima e trava textos anormais.
_MAX_TTS_CHARS = 1500
_EDGE_TIMEOUT_SECONDS = 30


@dataclass(frozen=True)
class VoiceProfile:
    """Identidade vocal de um mentor (fornecedor edge)."""

    voice: str
    rate: str = "+0%"
    pitch: str = "+0Hz"


# Uma voz por mentor — tons definidos na visão de produto: nunca imitar
# pessoas reais; apenas carácter (calmo, pausado, claro, caloroso, neutro).
_VOICE_PROFILES: dict[str, VoiceProfile] = {
    # Ética e Compaixão (inspirado em Jesus): calmo, acolhedor, próximo.
    "etica-compaixao-01": VoiceProfile("pt-PT-DuarteNeural", rate="-8%", pitch="-2Hz"),
    # Caminho do Meio (inspirado em Buda): pausado, contemplativo.
    "buda-01": VoiceProfile("pt-PT-DuarteNeural", rate="-16%", pitch="-6Hz"),
    # Filosofia Espírita (inspirado em Allan Kardec): claro, racional, seguro.
    "allan-kardec-01": VoiceProfile("pt-PT-DuarteNeural", rate="+2%", pitch="+2Hz"),
    # Reino Interior (inspirada em Maria Madalena): calorosa, firme.
    "maria-madalena-01": VoiceProfile("pt-PT-RaquelNeural", rate="-6%", pitch="-2Hz"),
    # Mentor de Sabedoria Universal (síntese): neutro, luminoso.
    "mentor-sabedoria-universal": VoiceProfile("pt-PT-RaquelNeural", rate="-2%", pitch="+0Hz"),
}
_DEFAULT_PROFILE = VoiceProfile("pt-PT-DuarteNeural")


def _limpar_audios_antigos() -> None:
    """Apaga MP3s gerados há mais de 1h — sem scheduler, chega para o MVP."""
    limite = time.time() - _AUDIO_MAX_AGE_SECONDS
    for nome in os.listdir(_AUDIO_DIR):
        caminho = os.path.join(_AUDIO_DIR, nome)
        if os.path.isfile(caminho) and os.path.getmtime(caminho) < limite:
            os.remove(caminho)


def _sintetizar_edge(texto: str, persona_id: str | None, caminho: str) -> None:
    import edge_tts

    profile = _VOICE_PROFILES.get(persona_id or "", _DEFAULT_PROFILE)

    async def _run() -> None:
        communicate = edge_tts.Communicate(
            texto, profile.voice, rate=profile.rate, pitch=profile.pitch
        )
        await asyncio.wait_for(communicate.save(caminho), timeout=_EDGE_TIMEOUT_SECONDS)

    # Os endpoints de chat são síncronos (correm no threadpool do FastAPI),
    # por isso é seguro criar aqui um event loop próprio.
    asyncio.run(_run())


def _sintetizar_gtts(texto: str, speaking_pace: str, caminho: str) -> None:
    from gtts import gTTS

    gTTS(text=texto, lang="pt", slow=(speaking_pace == "lenta")).save(caminho)


def sintetizar(
    texto: str, persona_id: str | None = None, speaking_pace: str = "normal"
) -> str | None:
    """Gera um MP3 e devolve o URL público, ou None se toda a síntese falhar.

    Cadeia: fornecedor de TTS_PROVIDER → fallback gTTS → None (sem áudio).
    """
    os.makedirs(_AUDIO_DIR, exist_ok=True)
    _limpar_audios_antigos()

    texto = texto[:_MAX_TTS_CHARS]
    nome_ficheiro = f"{uuid.uuid4()}.mp3"
    caminho = os.path.join(_AUDIO_DIR, nome_ficheiro)
    url = f"/static/audio/{nome_ficheiro}"

    provider = os.environ.get("TTS_PROVIDER", "edge").strip().lower()

    if provider == "edge":
        try:
            _sintetizar_edge(texto, persona_id, caminho)
            return url
        except Exception:
            # Serviço não-oficial pode falhar ou mudar — cai para o gTTS sem
            # interromper a conversa.
            pass

    try:
        _sintetizar_gtts(texto, speaking_pace, caminho)
        return url
    except Exception:
        # Sem rede para nenhum fornecedor: a resposta segue sem voz.
        return None
