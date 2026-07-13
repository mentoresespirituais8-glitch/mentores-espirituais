"""
Testa que o system prompt e a moderação aplicam mesmo as regras de
docs/LEGAL-GUARDRAILS.md — esta é a camada mais importante da plataforma
para não representar figuras reais de forma enganosa.
"""
from app.core.guardrails import build_synthesis_prompt, build_system_prompt, moderate_response
from app.personas.models import AvatarConfig, AvatarStyle, Persona, Source, SourceExcerpt

PERSONA = Persona(
    id="teste-01",
    slug="teste",
    display_name="Mentor de Teste",
    inspired_by=["Figura Histórica"],
    tagline="tagline",
    avatar=AvatarConfig(style=AvatarStyle.ILUSTRACAO_ABSTRATA, asset="x.svg"),
    sources=[Source(title="A", type="t", reference="r"), Source(title="B", type="t", reference="r")],
    system_prompt_notes="notas de estilo de teste",
)

EXCERPTS = [SourceExcerpt(source_title="Fonte A", text="Um excerto de exemplo.")]


def test_system_prompt_includes_disclaimer_text():
    prompt = build_system_prompt(PERSONA, EXCERPTS)
    assert "simulação criada por Inteligência Artificial" in prompt


def test_system_prompt_forbids_claiming_to_be_the_real_person():
    prompt = build_system_prompt(PERSONA, EXCERPTS)
    assert "Nunca afirmes ou sugiras que és a pessoa real" in prompt


def test_system_prompt_forbids_claiming_authorization():
    prompt = build_system_prompt(PERSONA, EXCERPTS)
    assert "autorização, parceria ou aprovação oficial" in prompt


def test_system_prompt_includes_retrieved_excerpts():
    prompt = build_system_prompt(PERSONA, EXCERPTS)
    assert "Um excerto de exemplo." in prompt


def test_synthesis_prompt_forbids_speaking_as_single_real_person():
    prompt = build_synthesis_prompt(
        "Mentor Sintetizado",
        [PERSONA],
        {PERSONA.id: EXCERPTS},
        "notas de síntese de teste",
    )
    assert "NUNCA respondas como se fosses uma única pessoa real" in prompt


def test_moderate_response_blocks_first_person_real_identity_claim():
    result = moderate_response("Mentor de Teste", "Eu sou realmente essa pessoa histórica.")
    assert result.allowed is False
    assert result.reason is not None


def test_moderate_response_allows_normal_educational_text():
    result = moderate_response("Mentor de Teste", "Segundo as fontes públicas, esta figura defendia a compaixão.")
    assert result.allowed is True
