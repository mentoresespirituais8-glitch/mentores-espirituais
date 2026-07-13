from __future__ import annotations

import os
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException
from gtts import gTTS
from sqlalchemy.orm import Session

from app.chat.rate_limit import enforce_rate_limit
from app.core.config import get_settings
from app.core.guardrails import build_synthesis_prompt, build_system_prompt, moderate_response
from app.db.models import ChatMessage
from app.db.session import get_db_session
from app.personas import service
from app.personas.schemas import ChatHistoryOut, ChatHistoryTurn, ChatMessageIn, ChatMessageOut

router = APIRouter(prefix="/chat", tags=["chat"])

_AUDIO_DIR = os.path.join("static", "audio")
_AUDIO_MAX_AGE_SECONDS = 3600


def _limpar_audios_antigos() -> None:
    """Apaga MP3s gerados há mais de 1h. Chamado a cada geração — sem scheduler,
    suficiente para o volume de um único servidor de desenvolvimento/MVP."""
    limite = time.time() - _AUDIO_MAX_AGE_SECONDS
    for nome in os.listdir(_AUDIO_DIR):
        caminho = os.path.join(_AUDIO_DIR, nome)
        if os.path.isfile(caminho) and os.path.getmtime(caminho) < limite:
            os.remove(caminho)


def criar_audio(texto: str, speaking_pace: str = "normal") -> str:
    """Gera um MP3 com nome único e devolve o URL público (servido em app.main
    via StaticFiles). speaking_pace vem de avatar.speaking_pace de cada persona
    (ver app/personas/models.py) — o único ajuste de entrega que o TTS
    genérico permite sem fornecedor pago; ainda assim aproxima o ritmo da
    fala ao TOM DE VOZ já descrito no system_prompt_notes de cada uma."""
    os.makedirs(_AUDIO_DIR, exist_ok=True)
    _limpar_audios_antigos()
    nome_ficheiro = f"{uuid.uuid4()}.mp3"
    caminho = os.path.join(_AUDIO_DIR, nome_ficheiro)
    gTTS(text=texto, lang="pt", slow=(speaking_pace == "lenta")).save(caminho)
    return f"/static/audio/{nome_ficheiro}"


def _load_history(db: Session, session_id: str) -> list[dict[str, str]]:
    """Histórico persistido em base de dados (ChatMessage) — sobrevive a
    reinícios do servidor, ao contrário do dicionário em memória que existia
    antes aqui."""
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id)
        .all()
    )
    return [{"role": row.role, "content": row.content} for row in rows]


def _save_turn(db: Session, session_id: str, role: str, content: str) -> None:
    db.add(ChatMessage(session_id=session_id, role=role, content=content))
    db.commit()


def _call_llm(system_prompt: str, history: list[dict[str, str]], user_message: str) -> str:
    settings = get_settings()

    if not settings.gemini_api_key:
        # Modo de desenvolvimento sem chave de API configurada — devolve uma
        # resposta simulada para permitir testar o fluxo ponta a ponta.
        return (
            "[modo de desenvolvimento — GEMINI_API_KEY não configurada]\n"
            f"Recebi a tua mensagem: \"{user_message}\". "
            "Configura GEMINI_API_KEY no .env para respostas reais."
        )

    from google import genai
    from google.genai import errors as genai_errors
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)

    # A Gemini API usa "model" onde o histórico interno (estilo Anthropic)
    # usa "assistant" — traduzir ao chamar, sem mudar o formato guardado.
    contents = [
        types.Content(
            role="model" if turn["role"] == "assistant" else "user",
            parts=[types.Part(text=turn["content"])],
        )
        for turn in history
    ]
    contents.append(types.Content(role="user", parts=[types.Part(text=user_message)]))

    try:
        response = client.models.generate_content(
            model=settings.llm_model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                max_output_tokens=1024,
                # Sem isto, o modelo gasta a maior parte do orçamento de tokens a
                # "pensar" internamente antes de responder, deixando pouco ou
                # nada para a resposta visível (respostas cortadas a meio).
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
    except genai_errors.ClientError as exc:
        if exc.code == 429:
            # Quota diária/por-minuto do próprio Gemini esgotada (nível
            # gratuito) — distinto do nosso rate_limit.py, que existe
            # precisamente para evitar chegar aqui com tanta frequência.
            return (
                "De momento este mentor recebeu demasiados pedidos e a "
                "quota gratuita da IA esgotou-se por hoje. Tenta novamente "
                "mais tarde."
            )
        raise
    return response.text


@router.post("/persona/{persona_id}", response_model=ChatMessageOut, dependencies=[Depends(enforce_rate_limit)])
def chat_with_persona(
    persona_id: str, payload: ChatMessageIn, db: Session = Depends(get_db_session)
) -> ChatMessageOut:
    persona = service.get_persona(persona_id)
    if persona is None:
        raise HTTPException(status_code=404, detail="Persona não encontrada")

    settings = get_settings()
    sid = payload.session_id or str(uuid.uuid4())
    history = _load_history(db, sid)

    excerpts = service.retrieve_excerpts(persona, payload.message)
    system_prompt = build_system_prompt(persona, excerpts)

    draft_reply = _call_llm(system_prompt, history, payload.message)
    moderation = moderate_response(persona.display_name, draft_reply)

    if not moderation.allowed:
        _save_turn(db, sid, "user", payload.message)
        _save_turn(db, sid, "assistant", settings.disclaimer_text)
        return ChatMessageOut(
            persona_id=persona_id,
            session_id=sid,
            reply=settings.disclaimer_text,
            disclaimer=settings.disclaimer_text,
            blocked=True,
            block_reason=moderation.reason,
        )

    _save_turn(db, sid, "user", payload.message)
    _save_turn(db, sid, "assistant", draft_reply)

    return ChatMessageOut(
        persona_id=persona_id,
        session_id=sid,
        reply=draft_reply,
        audio_url=criar_audio(draft_reply, persona.avatar.speaking_pace),
        disclaimer=settings.disclaimer_text,
    )


@router.post("/mentor/{mentor_id}", response_model=ChatMessageOut, dependencies=[Depends(enforce_rate_limit)])
def chat_with_synthesized_mentor(
    mentor_id: str, payload: ChatMessageIn, db: Session = Depends(get_db_session)
) -> ChatMessageOut:
    mentor = service.get_synthesis(mentor_id)
    if mentor is None:
        raise HTTPException(status_code=404, detail="Mentor não encontrado")

    settings = get_settings()
    sid = payload.session_id or str(uuid.uuid4())
    history = _load_history(db, sid)

    source_personas = service.resolve_synthesis_sources(mentor)
    excerpts_by_persona = {
        persona.id: service.retrieve_excerpts(persona, payload.message)
        for persona in source_personas
    }
    system_prompt = build_synthesis_prompt(
        mentor.display_name, source_personas, excerpts_by_persona, mentor.synthesis_prompt_notes
    )

    draft_reply = _call_llm(system_prompt, history, payload.message)
    moderation = moderate_response(mentor.display_name, draft_reply)

    if not moderation.allowed:
        _save_turn(db, sid, "user", payload.message)
        _save_turn(db, sid, "assistant", settings.disclaimer_text)
        return ChatMessageOut(
            persona_id=mentor_id,
            session_id=sid,
            reply=settings.disclaimer_text,
            disclaimer=settings.disclaimer_text,
            blocked=True,
            block_reason=moderation.reason,
        )

    _save_turn(db, sid, "user", payload.message)
    _save_turn(db, sid, "assistant", draft_reply)

    return ChatMessageOut(
        persona_id=mentor_id,
        session_id=sid,
        reply=draft_reply,
        audio_url=criar_audio(draft_reply),
        disclaimer=settings.disclaimer_text,
    )


@router.get("/session/{session_id}", response_model=ChatHistoryOut)
def get_chat_history(session_id: str, db: Session = Depends(get_db_session)) -> ChatHistoryOut:
    """Devolve o histórico persistido de uma sessão — usado pelo frontend para
    restaurar a conversa visível ao recarregar a página (ver PersonaCall.tsx)."""
    history = _load_history(db, session_id)
    return ChatHistoryOut(
        session_id=session_id,
        messages=[ChatHistoryTurn(role=turn["role"], content=turn["content"]) for turn in history],
    )
