# Mentores Espirituais

Plataforma de aprendizagem espiritual baseada em IA que permite explorar os
ensinamentos, textos e obras de grandes figuras espirituais através de
fontes públicas (livros, textos religiosos/filosóficos de domínio público).
**Nenhuma persona representa a pessoa real** — ver `docs/LEGAL-GUARDRAILS.md`
para as regras completas.

Personas atuais:
- **Jesus Cristo** — Bíblia, tradução Almeida (domínio público)
- **Allan Kardec** — O Livro dos Espíritos (1857, domínio público)
- **Buda** — Dhammapada, tradução de Bhikkhu Dhammiko (licença de distribuição gratuita)
- **Maria Madalena** — Evangelho de Maria, texto apócrifo gnóstico do séc. II
  (⚠ autoria historicamente disputada — ver `system_prompt_notes` em
  `mentora-reino-interior.json` antes de alterar esta persona)

Mentor sintetizado: **Mentor de Sabedoria Universal** — combina as quatro
personas acima, atribuindo cada ideia à sua origem e destacando convergências
e divergências doutrinárias (ver `mentor-sabedoria-universal.synthesis.json`).

Avatares: as 4 personas usam retratos fotorealistas **fictícios** gerados
por IA (decisão de 2026-07-08, ver regra 6 em `LEGAL-GUARDRAILS.md`) — não
são retratos reais das figuras. O mentor sintetizado mantém o ícone
abstrato (não faz sentido "retratar" uma síntese de 4 tradições).

## Estrutura

```
backend/    API FastAPI (personas, chat, guardrails, RAG)
frontend/   React + Vite (listagem de mentores + "chamada de vídeo")
docs/       Regras legais/éticas e template para criar novas personas
```

## Como correr localmente

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
copy .env.example .env         # e preencher GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

Sem `GEMINI_API_KEY` preenchida, o chat corre em modo de desenvolvimento
com respostas simuladas — suficiente para testar o fluxo todo (guardrails,
disclaimer, UI) sem custos de API.

**Obter uma chave Gemini gratuita:**
1. Entrar em [aistudio.google.com](https://aistudio.google.com) com uma conta Google
2. "Get API key" → "Create API key"
3. Colar o valor em `GEMINI_API_KEY=` no `.env`

O nível gratuito do Gemini tem limites de pedidos por minuto/dia, mas não
pede cartão de crédito nem cobra nada enquanto ficares dentro deles —
adequado para esta fase inicial sem custos.

**Windows — se `fastembed`/`onnxruntime` falhar ao importar** com um erro de
"DLL load failed": falta a versão mais recente do Visual C++ Redistributable.
Instalar com `winget install --id Microsoft.VCRedist.2015+.x64 -e` e tentar
de novo. Sem isto, o backend continua a funcionar, mas cai automaticamente
para a pesquisa por palavra-chave (menos precisa) em vez de embeddings.

### Testes

```bash
cd backend
pytest
```

Cobre os modelos/validadores (regras do `LEGAL-GUARDRAILS.md`), o
carregamento real das personas, os guardrails (system prompt + moderação),
os endpoints da API e o fluxo de takedown. Corre em ~1 minuto (o modelo de
embeddings já fica em cache local após a primeira execução).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`. O Vite faz proxy de `/api/*` para o backend em
`http://localhost:8000` (ver `vite.config.ts`).

Testes (Vitest + Testing Library): `npm test`. Cobre o bug já corrigido das
iniciais do avatar (regressão), o `DisclaimerBanner` (nunca pode ter botão
de fechar), o `PersonaCard`, e a `HomePage` (personas + mentores
sintetizados + estado de erro).

## Publicar online (Vercel + Render)

Frontend e backend publicam-se em serviços separados, ambos com nível
gratuito. Precisas de criar as contas tu mesmo (Vercel e Render usam login
com GitHub) — os passos abaixo assumem que o código já está num repositório
GitHub.

**Backend (Render):**
1. No dashboard do Render, "New" → "Blueprint" → escolhe este repositório
   (usa o `render.yaml` na raiz, já configurado).
2. Preenche as variáveis marcadas `sync: false` no `render.yaml`:
   `GEMINI_API_KEY` (a mesma do `.env` local) e `CORS_ORIGINS` (só sabes o
   valor certo depois do passo do Vercel — podes deixar em branco por agora
   e voltar aqui).
3. Guarda o URL que o Render atribui (algo como
   `https://mentores-espirituais-backend.onrender.com`).

**Frontend (Vercel):**
1. "Add New" → "Project" → escolhe este repositório.
2. Define "Root Directory" = `frontend`.
3. Em "Environment Variables", adiciona `VITE_API_BASE_URL` com o URL do
   Render do passo anterior (sem barra final).
4. Depois de publicado, copia o domínio do Vercel (ex.
   `https://mentores-espirituais.vercel.app`) e volta ao Render para
   preencher `CORS_ORIGINS` com `["https://mentores-espirituais.vercel.app"]`
   — sem isto o backend recusa os pedidos do frontend por CORS.

**Limitação a saber:** o disco do plano gratuito do Render é efémero — a
base de dados SQLite (`mentores.db`, ver `app/db/`) e os áudios gerados
apagam-se sempre que o serviço reinicia ou adormece por inatividade. Bom
para testar e mostrar a alguém; para persistência permanente, trocar
`DATABASE_URL` por uma Postgres alojada com nível gratuito (Neon, Supabase).

## Como adicionar um novo Mentor

1. Segue `docs/PERSONA-TEMPLATE.md` para preencher o dossiê (fontes públicas,
   avatar não-realista, notas de estilo).
2. Cria `backend/app/personas/data/<slug>.json` com esse conteúdo.
3. Corre a checklist de `docs/LEGAL-GUARDRAILS.md` antes de publicar.
4. Reinicia o backend — as personas são carregadas automaticamente de todos
   os `.json` em `app/personas/data/`.

Para um Mentor sintetizado (combina várias personas), usa o formato
`<slug>.synthesis.json` — ver `app/personas/models.py::MentorSynthesis` e
`app/core/guardrails.py::build_synthesis_prompt` (exemplo real:
`mentor-sabedoria-universal.synthesis.json`).

Avatar visual: cria um SVG abstrato próprio em `frontend/public/avatars/` (ver
os já existentes como referência de estilo) e aponta `avatar.asset` (ou
`avatar_asset` num mentor sintetizado) para esse caminho. Sem asset, a
persona cai automaticamente para as iniciais do nome (ver
`frontend/src/components/Avatar.tsx`). Cada símbolo é escolhido para fazer
sentido na época/cultura da figura (ex. Ichthys para Jesus no séc. I, roda
do Dharma para Buda na Índia antiga) — nunca um rosto realista (regra 6).

Logótipo do site: `frontend/public/logo.svg` (livro + chama), usado no
cabeçalho da homepage e como favicon.

## Roadmap de fases

1. ~~**MVP**~~ — feito: chat de texto e voz (Web Speech API + TTS), avatar
   animado (reage ao volume, respira, pisca os olhos — ver `PersonaCall.tsx`),
   guardrails de prompt + moderação heurística, RAG por embeddings
   multilingues (com fallback por palavra-chave), histórico de conversa
   persistido em base de dados (`app/db/models.py::ChatMessage` — sobrevive a
   reinícios do backend).
2. **Avatar com lip-sync real** — escolher fornecedor (D-ID / HeyGen / Simli,
   requer conta/API key externa e tem custo por minuto), implementar
   `backend/app/avatar/router.py`, ligar o vídeo resultante em
   `frontend/src/pages/PersonaCall.tsx` (já preparado com o `video-panel`).
   Até lá, o avatar usa animação CSS reativa ao volume da voz (grátis, sem
   fornecedor externo).
3. **RAG a escalar** — `app/personas/embeddings.py` já usa embeddings
   multilingues (fastembed) em memória; se o número de personas/excertos
   crescer muito, migrar para um vector store persistente (chromadb/pgvector)
   mantendo a mesma assinatura de `retrieve_excerpts`.
4. **Painel de gestão de personas** — CRUD sem código para não-programadores
   editarem dossiês, com fluxo de aprovação antes de publicar.
5. ~~**Mecanismo de takedown**~~ — feito: formulário público em
   `/pedido-remocao` + `POST /takedown-requests` (guardado em
   `backend/app/takedown/data/takedown_requests.jsonl`). Antes de produção,
   substituir a persistência por uma tabela real e proteger
   `GET /takedown-requests` com autenticação de equipa (ver TODO no router).
6. **Licenciamento oficial** — personas com `status: licenciado`, avatar/voz
   reais mediante contrato, distinguidas visualmente das personas públicas.
7. **Expansão internacional** — validar direitos de personalidade/imagem por
   jurisdição antes de cada novo mercado.

## Notas de segurança

- Nunca fazer commit de `.env` (já no `.gitignore`).
- Nunca colocar chaves de API no frontend — todas as chamadas a LLM/TTS/
  avatar passam pelo backend.
- Toda a geração de texto para o utilizador passa por
  `app/core/guardrails.py` (`build_system_prompt` / `build_synthesis_prompt`
  + `moderate_response`) — não criar um caminho de chat que ignore isto.
