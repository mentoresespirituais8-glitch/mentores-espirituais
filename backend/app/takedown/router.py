"""
Endpoint público de pedidos de remoção/correção de uma persona — ver
docs/LEGAL-GUARDRAILS.md, secção "Mecanismo de takedown". Qualquer figura
pública (ou representante legal/espólio) pode usar isto para pedir a
suspensão ou correção de uma persona.

O endpoint de listagem (`GET /takedown-requests`) não tem autenticação —
está aqui só para facilitar o desenvolvimento local. Antes de produção,
proteger com autenticação de equipa (ver TODO abaixo).
"""
from __future__ import annotations

from fastapi import APIRouter

from app.takedown import storage
from app.takedown.schemas import TakedownRequestIn, TakedownRequestOut, TakedownRequestRecord

router = APIRouter(prefix="/takedown-requests", tags=["takedown"])


@router.post("", response_model=TakedownRequestOut)
def create_takedown_request(payload: TakedownRequestIn) -> TakedownRequestOut:
    record = storage.append_request(payload)
    return TakedownRequestOut(
        id=record.id,
        status=record.status,
        message=(
            "Pedido recebido. A nossa equipa vai rever este pedido e "
            "responder ao email indicado assim que possível."
        ),
    )


# TODO: proteger com autenticação de equipa antes de produção — este
# endpoint expõe nomes e emails de quem submete pedidos.
@router.get("", response_model=list[TakedownRequestRecord])
def list_takedown_requests() -> list[TakedownRequestRecord]:
    return storage.list_requests()
