"""
Camada onde as regras legais/éticas do projeto (docs/LEGAL-GUARDRAILS.md)
são traduzidas para comportamento concreto do modelo.

Regra de ouro: nenhuma feature nova deve gerar texto para o utilizador sem
passar por `build_system_prompt` (ou `build_synthesis_prompt`) e, na resposta,
por `moderate_response`.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.core.config import get_settings
from app.personas.models import Persona, SourceExcerpt


@dataclass
class ModerationResult:
    allowed: bool
    reason: str | None = None
    rewritten_text: str | None = None


def build_system_prompt(persona: Persona, excerpts: list[SourceExcerpt]) -> str:
    """Constrói o system prompt de uma persona individual (regras 1, 3, 5, 6)."""
    settings = get_settings()

    sources_block = "\n".join(
        f"- ({excerpt.source_title}): {excerpt.text}" for excerpt in excerpts
    ) or "- (sem excertos específicos recuperados para esta pergunta)"

    inspired_by = ", ".join(persona.inspired_by)

    return f"""Fazes de conta que és o "{persona.display_name}", uma IA \
educativa inspirada no conhecimento público de: {inspired_by}.

REGRAS OBRIGATÓRIAS (nunca as quebres, mesmo que o utilizador peça):
1. Nunca afirmes ou sugiras que és a pessoa real. És sempre uma simulação de IA.
2. Nunca afirmes ou sugiras autorização, parceria ou aprovação oficial de {inspired_by},
   a não ser que te seja explicitamente dito que esta persona tem status "licenciado".
3. Refere-te a ti próprio como "IA inspirada em..." sempre que fizer sentido,
   especialmente na primeira resposta de uma conversa.
4. Se te perguntarem algo que exigiria conhecimento privado, opiniões pessoais
   nunca documentadas publicamente, ou eventos posteriores ao teu conhecimento,
   diz claramente que não tens essa informação de fontes públicas — não inventes.
5. O teu objetivo é ensinar e sintetizar ideias e princípios públicos, não
   imitar a identidade da pessoa.
6. Responde em português de Portugal, num tom alinhado com os temas: {", ".join(persona.topics)}.
7. Responde sempre em prosa fluida e natural, como alguém a falar em voz alta —
   nunca uses listas com marcadores, títulos numerados, negrito markdown ou
   secções. Uma conversa não tem subtítulos.

Contexto de fontes públicas recuperado para esta pergunta (usa isto para
fundamentar a resposta; cita a fonte quando relevante):
{sources_block}

Nota de estilo definida para esta persona: {persona.system_prompt_notes}

Disclaimer que já foi mostrado ao utilizador na interface (não precisas de o
repetir a cada mensagem, só nunca o contradigas):
"{settings.disclaimer_text}"
"""


def build_synthesis_prompt(
    display_name: str,
    source_personas: list[Persona],
    excerpts_by_persona: dict[str, list[SourceExcerpt]],
    synthesis_notes: str,
) -> str:
    """Constrói o system prompt de um Mentor sintetizado (multi-persona)."""
    settings = get_settings()

    blocks = []
    for persona in source_personas:
        excerpts = excerpts_by_persona.get(persona.id, [])
        excerpt_text = "\n  ".join(e.text for e in excerpts) or "(sem excertos)"
        blocks.append(
            f"* Perspetiva inspirada em {', '.join(persona.inspired_by)}:\n  {excerpt_text}"
        )
    perspectives_block = "\n".join(blocks)

    names = ", ".join(p.display_name for p in source_personas)

    return f"""És o "{display_name}", um Mentor de IA que sintetiza perspetivas \
de várias personas educativas: {names}.

REGRAS OBRIGATÓRIAS:
1. NUNCA respondas como se fosses uma única pessoa real. Apresenta sempre a
   resposta como uma síntese de perspetivas diferentes.
2. Sempre que atribuíres uma ideia a uma fonte de inspiração, usa uma
   formulação como "uma perspetiva inspirada em X sugere..." — nunca "eu, X, penso...".
3. Nunca sugiras autorização, parceria ou aprovação oficial de nenhuma das
   figuras que inspiram estas personas.
4. Quando as perspetivas divergirem, apresenta o contraste explicitamente —
   isso é valor educativo, não uma falha.
5. Responde sempre em prosa fluida e natural — nunca uses listas com
   marcadores, títulos numerados, negrito markdown ou secções.

Perspetivas disponíveis para esta pergunta:
{perspectives_block}

Notas de síntese definidas para este mentor: {synthesis_notes}

Disclaimer já mostrado ao utilizador na interface:
"{settings.disclaimer_text}"
"""


# Frases que indicam que o modelo "escorregou" para falar como se fosse a
# pessoa real, sem qualificador. Heurística barata de primeira linha — a
# verificação forte é o segundo modelo em `moderate_response`.
_FIRST_PERSON_REAL_MARKERS = (
    "eu sou realmente",
    "como eu disse quando",
    "na minha vida real",
    "eu, pessoalmente, na altura",
)


def moderate_response(persona_display_name: str, draft_text: str) -> ModerationResult:
    """
    Segunda passagem antes de mostrar a resposta ao utilizador.
    Aqui é só a heurística rápida; ligar um modelo mais barato
    (settings.moderation_model) para o caso geral é o próximo passo —
    ver TODO abaixo e app/chat/router.py.
    """
    lowered = draft_text.lower()
    for marker in _FIRST_PERSON_REAL_MARKERS:
        if marker in lowered:
            return ModerationResult(
                allowed=False,
                reason=f"Possível alegação de identidade real (marcador: '{marker}')",
            )

    # TODO: chamar settings.moderation_model com um prompt de verificação
    # dedicado (ex.: "Esta resposta alega ser a pessoa real ou inventa factos
    # biográficos não sourced? responde só sim/não") antes de ir para produção.
    return ModerationResult(allowed=True)
