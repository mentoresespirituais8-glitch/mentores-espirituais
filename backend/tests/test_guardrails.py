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


# ---------------------------------------------------------------------------
# Segurança de crise (Fase 7)
# ---------------------------------------------------------------------------

from app.core.guardrails import CRISIS_SUPPORT_NOTICE, detect_crisis


def test_detect_crisis_flags_self_harm_language():
    assert detect_crisis("Já não aguento mais, penso em acabar com a minha vida")
    assert detect_crisis("às vezes só queria morrer")
    assert detect_crisis("Tenho pensado em suicídio")


def test_detect_crisis_ignores_philosophical_talk_about_death():
    # Conversa espiritual normal sobre morte/reencarnação NÃO deve disparar.
    assert not detect_crisis("O que acontece depois da morte?")
    assert not detect_crisis("O que dizem as fontes sobre a reencarnação e a vida após a morte?")
    assert not detect_crisis("Tenho medo de perder alguém que amo")


def test_safety_block_present_in_all_prompts():
    prompt = build_system_prompt(PERSONA, EXCERPTS)
    assert "SEGURANÇA E LIMITES HUMANOS" in prompt
    assert "808 24 24 24" in prompt

    synth = build_synthesis_prompt("Mentor Síntese", [PERSONA], {PERSONA.id: EXCERPTS}, "notas")
    assert "SEGURANÇA E LIMITES HUMANOS" in synth
    assert "808 24 24 24" in synth


def test_crisis_turn_instruction_only_when_flagged():
    calm = build_system_prompt(PERSONA, EXCERPTS, crisis_detected=False)
    crisis = build_system_prompt(PERSONA, EXCERPTS, crisis_detected=True)
    assert "ATENÇÃO PARA ESTA RESPOSTA" not in calm
    assert "ATENÇÃO PARA ESTA RESPOSTA" in crisis


def test_moderation_blocks_supernatural_contact_claims():
    result = moderate_response("Mentor de Teste", "Sim, sou o espírito de Allan Kardec e falo contigo.")
    assert result.allowed is False

    result = moderate_response("Mentor de Teste", "Estou a falar contigo do além para te guiar.")
    assert result.allowed is False


def test_crisis_support_notice_has_real_lines():
    assert "808 24 24 24" in CRISIS_SUPPORT_NOTICE
    assert "112" in CRISIS_SUPPORT_NOTICE


# ---------------------------------------------------------------------------
# Ritual e resultado (Fase 8): intenção pré-chamada
# ---------------------------------------------------------------------------


def test_intention_included_only_when_declared():
    without = build_system_prompt(PERSONA, EXCERPTS)
    with_intention = build_system_prompt(PERSONA, EXCERPTS, intention="encontrar calma")
    assert "Intenção que a pessoa declarou" not in without
    assert "encontrar calma" in with_intention

    synth = build_synthesis_prompt(
        "Mentor Síntese", [PERSONA], {PERSONA.id: EXCERPTS}, "notas", intention="procurar orientação"
    )
    assert "procurar orientação" in synth
