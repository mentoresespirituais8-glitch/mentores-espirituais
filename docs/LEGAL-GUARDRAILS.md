# Guardrails legais e éticos da plataforma

Este documento é a fonte de verdade das regras de negócio que TODO o código
(prompts, UI, moderação, modelo de dados) tem de cumprir. Qualquer feature nova
deve ser validada contra esta lista antes de ir para produção.

## Regras fundamentais

1. Nunca apresentar uma personagem como sendo a pessoa real.
2. Nunca afirmar ou sugerir autorização, parceria ou aprovação de uma figura
   pública, salvo quando essa autorização existir efetivamente
   (ver `status: licenciado` no modelo de dados).
3. Cada personagem é apresentada como "IA inspirada no conhecimento público
   de..." ou "Mentor de IA baseado em fontes públicas" — nunca com o nome
   isolado sem esse qualificador (título da página, meta tags, mensagens
   partilhadas incluídas).
4. Disclaimer obrigatório, fixo e não removível pelo utilizador em toda a
   página de conversa:

   > "Esta personagem é uma simulação criada por Inteligência Artificial com
   > fins educativos. As respostas são geradas com base em informação
   > publicamente disponível e não representam declarações reais da pessoa
   > nem qualquer afiliação oficial."

5. Prioridade de produto: aprendizagem, comparação de ideias, preservação de
   conhecimento — nunca imitação de identidade.
6. Evitar reproduzir a aparência, voz ou outras características protegidas
   de **pessoas vivas**. Para figuras históricas falecidas há muito tempo,
   é permitido usar retratos com aspeto humano/fotorealista gerados por IA
   (`avatar.style: retrato-ficticio-realista`), desde que sejam
   composições inventadas/genéricas — nunca uma tentativa de reconstruir a
   aparência real e documentada da pessoa a partir de fotografias ou
   retratos históricos dela. `foto-realista` (reprodução real da pessoa)
   continua reservado a personas com `status: licenciado`. **Decisão
   registada em 2026-07-08**: o projeto optou deliberadamente por este
   estilo em vez de ilustrações abstratas, mantendo o disclaimer (regra 4)
   sempre visível para mitigar o risco de confusão.
7. O modelo de dados tem de suportar, desde o dia 1, a distinção entre
   personas públicas (`status: publico`) e licenciadas (`status: licenciado`
   + `owner_org`), para permitir expansão futura sem remodelação.

## Onde cada regra é aplicada no código

| Regra | Camada responsável | Ficheiro |
|---|---|---|
| 1, 3 | System prompt template | `backend/app/core/guardrails.py::build_system_prompt` |
| 2 | Validação de persona ao criar/editar | `backend/app/personas/models.py::Persona.status` |
| 4 | UI fixa, não fechável | `frontend/src/components/DisclaimerBanner.tsx` |
| 4 | Injeção server-side (defesa em profundidade — não confiar só no frontend) | `backend/app/chat/router.py` |
| 5, 6 | Guia de estilo visual | `docs/PERSONA-TEMPLATE.md` |
| Moderação pós-resposta | Verifica se o output "assume" ser a pessoa real ou inventa factos não sourced | `backend/app/core/guardrails.py::moderate_response` |
| 7 | Modelo de dados | `backend/app/personas/models.py` |

## Checklist de conteúdo por persona (antes de publicar)

- [ ] Todas as fontes listadas em `sources[]` são públicas ou de domínio
      público (livro publicado, entrevista pública, discurso público, artigo
      publicado). Nada de material privado, vazado ou sujeito a NDA.
- [ ] Sempre que possível, o texto integral e literal da obra foi ingerido
      em `backend/app/personas/sources/<persona_id>/*.txt` (ver
      `docs/PERSONA-TEMPLATE.md`) — em vez de paráfrases escritas por nós em
      `knowledge_chunks`. Isto é o que dá à persona uma base real "nos
      livros/textos deixados pela pessoa", em vez de resumos de terceiros.
- [ ] Cada fonte tem título, tipo, e referência (link ou citação bibliográfica).
- [ ] O avatar não reconstrói a aparência real e documentada da pessoa (ex.
      a partir de fotografias/retratos históricos dela) — se tiver aspeto
      fotorealista, tem de ser uma composição inventada/genérica (ver
      `docs/PERSONA-TEMPLATE.md`).
- [ ] A voz sintética não é uma clonagem da voz real (usar voz genérica de
      TTS, não uma voz "treinada" a soar como a pessoa).
- [ ] O `status` está correto (`publico` por omissão; `licenciado` só com
      documentação de licença anexada em `owner_org` / contrato arquivado).
- [ ] O disclaimer aparece antes da primeira interação e permanece visível.

## Mecanismo de takedown

Qualquer figura pública (ou representante legal/espólio) pode pedir remoção
ou correção de uma persona. Isto exige:
- Um formulário/contacto público e visível no rodapé ("Pedido de remoção ou
  correção") — a implementar em `frontend` + endpoint dedicado no backend.
- Prazo de resposta definido nos Termos de Serviço.
- Processo de suspensão imediata da persona (`status: suspenso`) enquanto o
  pedido é avaliado.

## Expansão comercial internacional — pontos de atenção

- Direitos de personalidade/imagem variam por jurisdição (EU, UK, EUA por
  estado — ex. Califórnia e Nova Iorque têm leis de "right of publicity" mais
  fortes, incluindo para pessoas falecidas em alguns estados).
- Antes de expandir para um novo mercado, validar localmente se citar/parafrasear
  uma figura pública para fins educativos com disclaimer é suficiente, ou se
  é necessário consentimento explícito nesse país.
- Manter registo de proveniência (fonte → excerto → resposta gerada) para
  poder demonstrar boa-fé em caso de disputa.
