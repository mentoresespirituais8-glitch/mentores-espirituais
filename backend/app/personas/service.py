"""
Carregamento de personas a partir de app/personas/data/*.json e recuperação
de excertos (RAG).

A recuperação é feita por embeddings multilingues (app/personas/embeddings.py)
sempre que o modelo estiver disponível — importante porque várias fontes
primárias estão em inglês (ex. cartas de Bezos) e as perguntas dos
utilizadores são em português; comparar por significado em vez de palavra
exata é o que permite uma pergunta em PT encontrar o excerto certo em EN.
Se o modelo de embeddings não carregar (ex. sem rede no primeiro arranque),
cai automaticamente para uma heurística de palavra-chave como rede de
segurança, para nunca deixar o chat sem contexto nenhum.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from app.personas import embeddings, ingest
from app.personas.models import MentorSynthesis, Persona, SourceExcerpt

DATA_DIR = Path(__file__).parent / "data"

_STOPWORDS = {
    "a", "o", "os", "as", "de", "do", "da", "dos", "das", "e", "que", "para",
    "com", "um", "uma", "como", "é", "no", "na", "em", "por", "se", "qual",
}


def _stem(word: str) -> str:
    """Stemming muito grosseiro (prefixo de 4 letras) para aproximar formas
    verbais/flexões em português (ex. 'perdoar'/'perdoamos'/'perdão' ->
    'perd') sem depender de uma lib de NLP. Suficiente para melhorar recall
    no MVP; um vector store real substitui isto por completo."""
    return word[:4] if len(word) > 4 else word


def _tokenize(text: str) -> set[str]:
    words = re.findall(r"[a-zà-ú0-9]+", text.lower())
    return {_stem(w) for w in words if w not in _STOPWORDS and len(w) > 2}


@lru_cache
def _load_all() -> tuple[dict[str, Persona], dict[str, MentorSynthesis]]:
    personas: dict[str, Persona] = {}
    syntheses: dict[str, MentorSynthesis] = {}

    for path in DATA_DIR.glob("*.json"):
        raw = json.loads(path.read_text(encoding="utf-8"))
        if path.name.endswith(".synthesis.json") or raw.get("type") == "sintetizado":
            mentor = MentorSynthesis(**raw)
            syntheses[mentor.id] = mentor
        else:
            persona = Persona(**raw)
            # Fontes primárias reais (app/personas/sources/<id>/*.txt) têm
            # sempre prioridade sobre knowledge_chunks escritos à mão no
            # JSON — ver docs/PERSONA-TEMPLATE.md.
            ingested = ingest.load_source_chunks(persona.id)
            if ingested:
                persona.knowledge_chunks = ingested
            personas[persona.id] = persona

    return personas, syntheses


def list_personas() -> list[Persona]:
    personas, _ = _load_all()
    return list(personas.values())


def list_syntheses() -> list[MentorSynthesis]:
    _, syntheses = _load_all()
    return list(syntheses.values())


def get_persona(persona_id: str) -> Persona | None:
    personas, _ = _load_all()
    return personas.get(persona_id)


def get_persona_by_slug(slug: str) -> Persona | None:
    personas, _ = _load_all()
    return next((p for p in personas.values() if p.slug == slug), None)


def get_synthesis(mentor_id: str) -> MentorSynthesis | None:
    _, syntheses = _load_all()
    return syntheses.get(mentor_id)


def _spread_sample(chunks: list[SourceExcerpt], n: int) -> list[SourceExcerpt]:
    """Amostra distribuída ao longo de todo o corpus (em vez de só o início) —
    importante quando o corpus é um texto longo (ex. vários capítulos
    bíblicos) e não há overlap de palavras-chave para orientar a escolha."""
    if len(chunks) <= n:
        return chunks
    step = len(chunks) / n
    return [chunks[int(i * step)] for i in range(n)]


_persona_embeddings_cache: dict[str, "object"] = {}


def _get_persona_embeddings(persona: Persona):
    """Calcula (e põe em cache) a matriz de embeddings dos knowledge_chunks
    de uma persona. Só é feito uma vez por persona, na primeira pergunta."""
    cached = _persona_embeddings_cache.get(persona.id)
    if cached is not None:
        return cached
    if not persona.knowledge_chunks:
        return None
    matrix = embeddings.embed([c.text for c in persona.knowledge_chunks])
    _persona_embeddings_cache[persona.id] = matrix
    return matrix


def _retrieve_by_embeddings(persona: Persona, query: str, top_k: int) -> list[SourceExcerpt] | None:
    matrix = _get_persona_embeddings(persona)
    if matrix is None:
        return None
    query_vec = embeddings.embed([query])
    if query_vec is None:
        return None
    scores = embeddings.cosine_similarities(query_vec[0], matrix)
    ranked_indices = scores.argsort()[::-1][:top_k]
    return [persona.knowledge_chunks[i] for i in ranked_indices]


def _retrieve_by_keywords(persona: Persona, query: str, top_k: int) -> list[SourceExcerpt]:
    """Ranking por overlap de palavras-chave — rede de segurança usada só
    quando o modelo de embeddings não está disponível (ver embeddings.py)."""
    query_tokens = _tokenize(query)
    if not query_tokens:
        return _spread_sample(persona.knowledge_chunks, top_k)

    scored = []
    for chunk in persona.knowledge_chunks:
        chunk_tokens = _tokenize(chunk.text)
        overlap = len(query_tokens & chunk_tokens)
        scored.append((overlap, chunk))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    top = [chunk for score, chunk in scored if score > 0][:top_k]
    if top:
        return top
    # Sem overlap nenhum — devolve uma amostra distribuída como contexto
    # geral em vez de nada, para o modelo continuar fundamentado.
    return _spread_sample(persona.knowledge_chunks, top_k)


def retrieve_excerpts(persona: Persona, query: str, top_k: int = 5) -> list[SourceExcerpt]:
    if not persona.knowledge_chunks:
        return []
    by_embeddings = _retrieve_by_embeddings(persona, query, top_k)
    if by_embeddings is not None:
        return by_embeddings
    return _retrieve_by_keywords(persona, query, top_k)


def resolve_synthesis_sources(mentor: MentorSynthesis) -> list[Persona]:
    personas, _ = _load_all()
    return [personas[pid] for pid in mentor.source_persona_ids if pid in personas]
