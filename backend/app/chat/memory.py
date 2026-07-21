"""
Memória de longo prazo das conversas (ponto 6 do documento de visão).

Como funciona:
- O histórico completo fica sempre na base de dados (ChatMessage) — nada é
  apagado ao resumir.
- Ao chamar o LLM, enviamos apenas as últimas RECENT_TURNS mensagens; o que
  ficou para trás é representado por um resumo persistido (SessionMemory),
  injetado no system prompt via build_system_prompt(memory=...).
- O resumo é atualizado de forma incremental: quando há UPDATE_EVERY ou mais
  mensagens antigas ainda não cobertas, condensamo-las no resumo existente.

Sem GEMINI_API_KEY (modo de desenvolvimento), o resumo cai num fallback
naïf — suficiente para testar o fluxo ponta a ponta sem custos.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import ChatMessage, SessionMemory

# Mensagens recentes enviadas por inteiro ao modelo em cada pedido.
RECENT_TURNS = 12
# Nº mínimo de mensagens antigas por cobrir antes de (re)gerar o resumo —
# evita chamar o modelo de resumo a cada mensagem (quota gratuita é limitada).
UPDATE_EVERY = 8

_SUMMARY_PROMPT = """Resume a conversa abaixo entre um utilizador e um mentor \
educativo de IA, para servir de memória em conversas futuras. Escreve em \
português de Portugal, em prosa compacta (máximo 180 palavras), na terceira \
pessoa, preservando: o nome do utilizador (ou como gosta de ser tratado), se \
o tiver dito; o que partilhou sobre a sua vida e estado emocional; os temas \
que mais lhe importam; conselhos, histórias ou exercícios que o mentor já \
propôs; e qualquer preferência expressa pelo utilizador. \
Não inventes nada que não esteja na conversa.

Resumo existente (a atualizar, pode estar vazio):
{previous}

Novas mensagens a incorporar:
{turns}
"""


def load_memory(db: Session, session_id: str) -> SessionMemory | None:
    return db.get(SessionMemory, session_id)


def recent_history(history: list[dict[str, str]]) -> list[dict[str, str]]:
    """A janela de mensagens enviada por inteiro ao modelo."""
    return history[-RECENT_TURNS:]


def delete_memory(db: Session, session_id: str) -> None:
    db.query(SessionMemory).filter(SessionMemory.session_id == session_id).delete()
    db.commit()


def _format_turns(turns: list[dict[str, str]]) -> str:
    labels = {"user": "Utilizador", "assistant": "Mentor"}
    return "\n".join(f"{labels.get(t['role'], t['role'])}: {t['content']}" for t in turns)


def _summarize(previous: str, turns: list[dict[str, str]]) -> str:
    settings = get_settings()

    if not settings.gemini_api_key:
        # Fallback de desenvolvimento: guarda os temas do utilizador de forma
        # truncada — permite ver a memória a funcionar sem chave de API.
        user_bits = "; ".join(t["content"][:80] for t in turns if t["role"] == "user")
        combined = f"{previous} O utilizador falou ainda de: {user_bits}".strip()
        return combined[-1200:]

    from google import genai
    from google.genai import errors as genai_errors
    from google.genai import types

    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        response = client.models.generate_content(
            model=settings.moderation_model,
            contents=_SUMMARY_PROMPT.format(
                previous=previous or "(vazio)", turns=_format_turns(turns)
            ),
            config=types.GenerateContentConfig(
                max_output_tokens=512,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
    except genai_errors.ClientError:
        # Quota esgotada ou erro transitório — não é grave: o resumo volta a
        # ser tentado quando houver novas mensagens por cobrir.
        return previous
    return (response.text or previous).strip()


def maybe_update_memory(db: Session, session_id: str) -> None:
    """Atualiza o resumo se houver mensagens antigas suficientes por cobrir.

    Chamado no fim de cada pedido de chat — na maioria das vezes não faz nada
    (barato); quando o histórico cresce, condensa as mensagens que saíram da
    janela recente.
    """
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id)
        .all()
    )
    history = [{"role": r.role, "content": r.content} for r in rows]

    memory = load_memory(db, session_id)
    covered = memory.covered_messages if memory else 0

    # Só resume o que já saiu da janela recente — o modelo continua a ver as
    # últimas RECENT_TURNS mensagens por inteiro.
    boundary = max(len(history) - RECENT_TURNS, 0)
    uncovered = history[covered:boundary]
    if len(uncovered) < UPDATE_EVERY:
        return

    previous = memory.summary if memory else ""
    new_summary = _summarize(previous, uncovered)
    if not new_summary or new_summary == previous:
        # Resumo falhou (ex. quota do modelo) — não avança a marca de
        # cobertura, para voltar a tentar com as mesmas mensagens mais tarde.
        return

    if memory is None:
        memory = SessionMemory(session_id=session_id)
        db.add(memory)
    memory.summary = new_summary
    memory.covered_messages = boundary
    memory.updated_at = datetime.now(timezone.utc)
    db.commit()
