# CLAUDE.md

Guia para assistentes de IA (Claude Code / Cowork) que trabalhem neste
repositório. Lê isto antes de alterar o que quer que seja.

## Regras de trabalho (obrigatórias)

1. **Evoluir, nunca recomeçar.** Não elimines, substituas ou refaças
   elementos existentes exceto quando o Hugo o pedir explicitamente. Trabalha
   como um programador sénior que continua um projeto em curso.
2. **Analisa antes de alterar.** Compreende o código existente e mantém tudo
   o que já funciona. Melhorias devem ser incrementais.
3. **Substituições exigem justificação.** Só substitui um componente quando a
   nova versão representar uma melhoria clara de experiência — e explica
   primeiro o que vais mudar e porquê, antes de mexer em secções importantes.
4. **Identidade visual preserva-se e refina-se** — não se muda. Paleta atual:
   azul/violeta escuro com dourado de destaque (tokens em
   `frontend/src/styles.css` `:root`). Decisão explícita do Hugo (2026-07-17):
   refinar a paleta atual, não mudar para outra.
5. **Guardrails são intocáveis sem discussão.** Toda a geração de texto passa
   por `backend/app/core/guardrails.py` (`build_system_prompt` /
   `build_synthesis_prompt` + `moderate_response`). Nunca criar um caminho de
   chat que os ignore. Ver `docs/LEGAL-GUARDRAILS.md`.
6. **Dúvidas de design ou arquitetura → perguntar ao Hugo antes de avançar.**

## O que é o projeto

Plataforma premium onde o utilizador conversa (texto e voz, com experiência
de "videochamada") com mentores de IA inspirados em figuras espirituais
históricas, usando apenas fontes de domínio público. Objetivo: referência
internacional. Visão completa: documento "Mentores Espirituais — Product
Vision & Roadmap" (10 pontos) + `README.md` (roadmap técnico).

- `backend/` — FastAPI: personas (4 individuais + 1 sintetizado), RAG por
  embeddings sobre `app/personas/sources/`, guardrails, moderação, rate
  limit, histórico em SQLite, TTS (gTTS), memória de conversas, takedown.
- `frontend/` — React + Vite + TypeScript. Homepage (hero com faixa de
  presença, demos de conversas, cartões com modal de perfil, como
  funciona/porquê confiar) e página de chamada (`PersonaCall.tsx`, moldura
  tipo webcam com avatar animado reativo ao volume).
- `docs/` — regras legais/éticas e template de personas.

## Como correr

Backend: `cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000`
(sem `GEMINI_API_KEY` no `.env` corre em modo dev com respostas simuladas).
Frontend: `cd frontend && npm run dev` → http://localhost:5173 (proxy /api → 8000).
Testes: `pytest` no backend; `npm test` no frontend. Correr ambos antes de dar
uma fase por terminada.

## Decisões já tomadas (não desfazer sem o Hugo pedir)

- **Linguagem de "chamada"**: CTAs dizem "Iniciar chamada"; os cartões têm
  selo "Disponível" com pulso verde; hero tem faixa de presença. O produto
  aponta para videochamada, não para um chat genérico.
- **Perfis de mentores em modal** (não página dedicada) — conteúdo em
  `frontend/src/lib/profiles.ts`: biografias, especialidades e conversas de
  exemplo escritas à mão no tom único de cada mentor. Demos na homepage E no
  perfil, com conteúdos diferentes.
- **Memória entre conversas ativa** (`backend/app/chat/memory.py`): resumo
  automático persistido (tabela `session_memories`) injetado no system
  prompt; janela recente de 12 mensagens segue por inteiro. O utilizador é
  informado na página de chamada e pode apagar tudo ("Começar de novo" →
  `DELETE /chat/session/{id}`).
- **Qualidade de conversa nos prompts**: inteligência emocional primeiro,
  ritmo falado (3-6 frases), pergunta de seguimento natural, histórias e
  citações com atribuição, exercícios como convite. Personalidades distintas
  via `system_prompt_notes` de cada persona JSON.
- Conversas de exemplo estáticas (profiles.ts) seguem as mesmas regras dos
  guardrails: nunca alegam ser a pessoa real, citam fontes.

## Decisões estratégicas (análise ChatGPT, 2026-07-17)

- **Camada de confiança implementada (Fase 6)**: cada resposta devolve os
  excertos do RAG (`sources` em `ChatMessageOut`); painel "Ver as raízes
  desta resposta" em PersonaCall; prompts distinguem citação de interpretação
  e admitem quando as fontes não sustentam a resposta; página pública
  `/metodologia`.
- **Contas/autenticação e monetização adiadas** de propósito: primeiro validar
  com 10-20 utilizadores reais. Quando chegar a monetização: nunca bloquear
  um mentor específico atrás de pagamento; cobrar profundidade/continuidade/
  voz/organização, nunca "proximidade espiritual".
- **Pendente (próximas fases)**: segurança de crise (Fase 7 — não validar
  delírios/contacto sobrenatural, deteção de risco, encaminhamento para apoio
  humano, aviso 18+); ritual e resultado (Fase 8 — reflexão de sessão,
  intenção pré-chamada, "ouvir outra perspetiva").
- **Marketing**: nunca anunciar "fala com Jesus/Buda" — sempre "explora
  ensinamentos através de mentores virtuais de IA".

## Estado das fases (2026-07-17)

1. ✅ Análise completa
2. ✅ Interface/UX premium da homepage
3. ✅ Conversação (prompts + memória)
4. ✅ Preparação para voz e videochamada — controlos na página de chamada:
   modo mãos-livres (fala/escuta contínua) e silenciar voz do mentor. O
   lip-sync real continua pendente de fornecedor (nível 2 do README).
5. ✅ Otimizações — logo-mark.png reduzido de 284 KB para 26 KB. Pendente de
   decisão do Hugo: `frontend/public/avatars/ChatGPT Image 8_07_2026,
   17_32_54.png` (2,5 MB) não é referenciado em lado nenhum — candidato a
   remoção. Correr `pytest` + `npm test` após cada fase.
