from fastapi import APIRouter, HTTPException

from app.personas import service
from app.personas.schemas import PersonaSummary

router = APIRouter(prefix="/personas", tags=["personas"])


@router.get("", response_model=list[PersonaSummary])
def list_personas() -> list[PersonaSummary]:
    return [PersonaSummary(**p.model_dump()) for p in service.list_personas()]


@router.get("/{persona_id}", response_model=PersonaSummary)
def get_persona(persona_id: str) -> PersonaSummary:
    persona = service.get_persona(persona_id)
    if persona is None:
        raise HTTPException(status_code=404, detail="Persona não encontrada")
    return PersonaSummary(**persona.model_dump())


@router.get("/mentores/sintetizados")
def list_synthesized_mentors():
    return [m.model_dump() for m in service.list_syntheses()]
