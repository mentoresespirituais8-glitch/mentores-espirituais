"""
Limite de pedidos ao endpoint de chat — protege a chave de API (nível
gratuito, com quota diária) de uso abusivo. Guardado em memória, suficiente
para uma única instância (ver nota em router.py sobre sessões).

Dois limites diferentes, por razões diferentes:
- Por IP, numa janela curta: impede uma só pessoa (ou um script) de
  bombardear o chat.
- Global (todos os IPs juntos), por dia: a quota gratuita da Gemini é por
  chave de API/projeto, não por visitante — um limite só por IP não a
  protege se vários visitantes diferentes esgotarem a quota em conjunto.
"""
from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request

from app.core.config import get_settings

# ip -> lista de timestamps (segundos) dos pedidos feitos nesta janela
_WINDOW_HITS: dict[str, list[float]] = defaultdict(list)
# timestamps (segundos) de todos os pedidos feitos hoje, por qualquer IP
_GLOBAL_DAY_HITS: list[float] = []


def _prune(hits: list[float], now: float, max_age_seconds: float) -> list[float]:
    return [t for t in hits if now - t < max_age_seconds]


def enforce_rate_limit(request: Request) -> None:
    settings = get_settings()
    ip = request.client.host if request.client else "desconhecido"
    now = time.time()

    window_hits = _prune(_WINDOW_HITS[ip], now, settings.rate_limit_window_seconds)
    if len(window_hits) >= settings.rate_limit_per_window:
        minutes = settings.rate_limit_window_seconds // 60
        raise HTTPException(
            status_code=429,
            detail=(
                f"Enviaste demasiadas mensagens em pouco tempo. "
                f"Espera uns minutos e tenta de novo (limite: {settings.rate_limit_per_window} "
                f"mensagens a cada {minutes} minutos)."
            ),
        )

    global _GLOBAL_DAY_HITS
    _GLOBAL_DAY_HITS = _prune(_GLOBAL_DAY_HITS, now, 24 * 60 * 60)
    if len(_GLOBAL_DAY_HITS) >= settings.rate_limit_per_day:
        raise HTTPException(
            status_code=429,
            detail=(
                "Esta plataforma atingiu o limite diário de conversas com a IA. "
                "Volta a tentar amanhã."
            ),
        )

    window_hits.append(now)
    _GLOBAL_DAY_HITS.append(now)
    _WINDOW_HITS[ip] = window_hits
