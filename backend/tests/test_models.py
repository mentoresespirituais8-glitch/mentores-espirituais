"""
Testa que as regras de docs/LEGAL-GUARDRAILS.md estão realmente aplicadas
pelo Pydantic — se estes testes falharem, alguém removeu uma salvaguarda.
"""
import pytest
from pydantic import ValidationError

from app.personas.models import AvatarConfig, AvatarStyle, MentorSynthesis, Persona, PersonaStatus, Source

VALID_AVATAR = AvatarConfig(style=AvatarStyle.ILUSTRACAO_ABSTRATA, asset="x.svg")
ONE_SOURCE = [Source(title="A", type="t", reference="r")]
TWO_SOURCES = [Source(title="A", type="t", reference="r"), Source(title="B", type="t", reference="r")]


def make_persona(**overrides):
    defaults = dict(
        id="teste-01",
        slug="teste",
        display_name="Teste",
        inspired_by=["Alguém"],
        tagline="tagline",
        avatar=VALID_AVATAR,
        sources=TWO_SOURCES,
    )
    defaults.update(overrides)
    return Persona(**defaults)


def test_persona_with_one_source_is_rejected():
    with pytest.raises(ValidationError, match="pelo menos 2 fontes"):
        make_persona(sources=ONE_SOURCE)


def test_persona_with_two_sources_is_accepted():
    persona = make_persona(sources=TWO_SOURCES)
    assert len(persona.sources) == 2


def test_foto_realista_avatar_requires_licenciado_status():
    foto_avatar = AvatarConfig(style=AvatarStyle.FOTO_REALISTA, asset="x.png")
    with pytest.raises(ValidationError, match="licenciado"):
        make_persona(avatar=foto_avatar, status=PersonaStatus.PUBLICO)


def test_foto_realista_avatar_allowed_when_licenciado():
    foto_avatar = AvatarConfig(style=AvatarStyle.FOTO_REALISTA, asset="x.png")
    persona = make_persona(avatar=foto_avatar, status=PersonaStatus.LICENCIADO)
    assert persona.avatar.style == AvatarStyle.FOTO_REALISTA


def test_retrato_ficticio_realista_does_not_require_licenciado_status():
    """Distinção deliberada de 'foto-realista': um retrato fotorealista mas
    inventado (ver LEGAL-GUARDRAILS.md, regra 6, decisão de 2026-07-08) não
    exige licenciamento — só a reprodução de uma pessoa real exige."""
    fictional_avatar = AvatarConfig(style=AvatarStyle.RETRATO_FICTICIO_REALISTA, asset="x.jpg")
    persona = make_persona(avatar=fictional_avatar, status=PersonaStatus.PUBLICO)
    assert persona.avatar.style == AvatarStyle.RETRATO_FICTICIO_REALISTA


def test_synthesis_mentor_requires_at_least_two_source_personas():
    with pytest.raises(ValidationError, match="2 personas-fonte"):
        MentorSynthesis(
            id="m1",
            slug="m1",
            display_name="Mentor Teste",
            source_persona_ids=["persona-1"],
        )


def test_synthesis_mentor_with_two_sources_is_accepted():
    mentor = MentorSynthesis(
        id="m1",
        slug="m1",
        display_name="Mentor Teste",
        source_persona_ids=["persona-1", "persona-2"],
    )
    assert len(mentor.source_persona_ids) == 2
