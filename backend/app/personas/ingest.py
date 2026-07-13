"""
Ingestão de fontes primárias reais — "os livros deixados por eles" — a
partir de ficheiros de texto em app/personas/sources/<persona_id>/*.txt.

Esta é a forma preferida de alimentar o conhecimento de uma persona: em vez
de excertos parafraseados à mão em knowledge_chunks no JSON, colocar aqui o
texto integral (ou o máximo possível) da obra original, já em domínio
público ou com licença que permita a utilização.

Cada linha não vazia do ficheiro é tratada como uma unidade de citação (ex.:
um versículo, um parágrafo de uma carta, uma frase de um discurso). Isto
favorece citações precisas em vez de paráfrases — importante tanto para
fidelidade educativa como para defesa de proveniência (ver
docs/LEGAL-GUARDRAILS.md).

Convenção de nome do ficheiro: <slug-da-fonte>.txt — o nome vira o
`source_title` mostrado ao utilizador/citado pelo modelo, por isso usa algo
legível, ex. "mateus-05-sermao-da-montanha.txt" -> "mateus 05 sermao da montanha".
"""
from __future__ import annotations

from pathlib import Path

from app.personas.models import SourceExcerpt

SOURCES_DIR = Path(__file__).parent / "sources"


def load_source_chunks(persona_id: str) -> list[SourceExcerpt]:
    persona_dir = SOURCES_DIR / persona_id
    if not persona_dir.exists():
        return []

    chunks: list[SourceExcerpt] = []
    for path in sorted(persona_dir.glob("*.txt")):
        source_title = path.stem.replace("-", " ")
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line:
                continue
            chunks.append(
                SourceExcerpt(source_title=source_title, text=line, persona_id=persona_id)
            )
    return chunks


def has_ingested_sources(persona_id: str) -> bool:
    persona_dir = SOURCES_DIR / persona_id
    return persona_dir.exists() and any(persona_dir.glob("*.txt"))
