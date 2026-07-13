"""
Persistência simples (JSON Lines) dos pedidos de remoção/correção — ver
docs/LEGAL-GUARDRAILS.md, secção "Mecanismo de takedown". Suficiente para o
MVP; antes de produção, substituir por uma tabela real (SQLAlchemy, já uma
dependência do projeto) com alertas automáticos para a equipa responsável.
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.takedown.schemas import TakedownRequestIn, TakedownRequestRecord

STORE_PATH = Path(__file__).parent / "data" / "takedown_requests.jsonl"


def append_request(payload: TakedownRequestIn) -> TakedownRequestRecord:
    record = TakedownRequestRecord(
        id=str(uuid.uuid4()),
        status="pendente",
        created_at=datetime.now(timezone.utc).isoformat(),
        **payload.model_dump(),
    )
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with STORE_PATH.open("a", encoding="utf-8") as f:
        f.write(record.model_dump_json() + "\n")
    return record


def list_requests() -> list[TakedownRequestRecord]:
    if not STORE_PATH.exists():
        return []
    records = []
    with STORE_PATH.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(TakedownRequestRecord(**json.loads(line)))
    return records
