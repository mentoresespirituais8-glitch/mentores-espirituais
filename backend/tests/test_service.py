"""
Testes de integração contra os dados reais em app/personas/data/ — se um
JSON novo ou editado falhar a validação do Pydantic, estes testes acusam
antes de chegar a produção.
"""
from app.personas import service
from app.personas.models import AvatarConfig, AvatarStyle, Persona, Source

EXPECTED_PERSONA_IDS = {
    "etica-compaixao-01",
    "allan-kardec-01",
    "buda-01",
    "maria-madalena-01",
}


def test_all_expected_personas_load():
    loaded_ids = {p.id for p in service.list_personas()}
    assert EXPECTED_PERSONA_IDS.issubset(loaded_ids)


def test_synthesis_mentor_loads_and_resolves_all_sources():
    mentor = service.get_synthesis("mentor-sabedoria-universal")
    assert mentor is not None
    sources = service.resolve_synthesis_sources(mentor)
    assert {p.id for p in sources} == set(mentor.source_persona_ids)


def test_get_persona_by_slug_matches_get_persona():
    persona = service.get_persona("etica-compaixao-01")
    assert persona is not None
    assert service.get_persona_by_slug(persona.slug).id == persona.id


def test_get_persona_returns_none_for_unknown_id():
    assert service.get_persona("nao-existe-123") is None


def test_retrieve_excerpts_returns_at_most_top_k():
    persona = service.get_persona("buda-01")
    excerpts = service.retrieve_excerpts(persona, "sofrimento e desejo", top_k=3)
    assert 0 < len(excerpts) <= 3


def test_retrieve_excerpts_empty_when_persona_has_no_knowledge_chunks():
    empty_persona = Persona(
        id="vazio-01",
        slug="vazio",
        display_name="Vazio",
        inspired_by=["Ninguém"],
        tagline="tagline",
        avatar=AvatarConfig(style=AvatarStyle.ILUSTRACAO_ABSTRATA, asset="x.svg"),
        sources=[Source(title="A", type="t", reference="r"), Source(title="B", type="t", reference="r")],
        knowledge_chunks=[],
    )
    assert service.retrieve_excerpts(empty_persona, "qualquer pergunta") == []
