# Template para criar uma nova persona (Mentor de IA)

## Regra de ouro do conteúdo: usar as obras reais deixadas pela pessoa

A base de conhecimento de uma persona deve ser, sempre que possível, o texto
**integral e literal** dos livros, cartas, discursos ou textos que a própria
pessoa deixou — não um resumo ou paráfrase escrita por nós. Exemplos:

- Jesus Cristo → o texto da Bíblia (Evangelhos), numa tradução em domínio
  público (ex. João Ferreira de Almeida, anterior a 1900).
- Um autor → o texto integral dos seus livros publicados, se em domínio
  público, ou excertos claramente citados e referenciados se não estiverem.
- Um empresário → cartas/discursos que ele próprio escreveu ou proferiu
  publicamente (ex. cartas anuais aos acionistas), não biografias escritas
  por terceiros sobre ele.

Isto tem duas vantagens: (1) fidelidade — as respostas citam palavras reais,
não a nossa interpretação delas; (2) defesa legal — em caso de disputa,
mostra-se exatamente de onde veio cada frase.

### Extrair texto de PDFs

Quando a fonte só existe em PDF, usar `pymupdf` (`pip install pymupdf`) para
extrair texto — dá resultados muito mais limpos em português (acentos,
til) do que `pypdf`, que por vezes corrompe combinações como "ão"/"ões" em
certas fontes incorporadas no PDF. Exemplo mínimo:

```python
import fitz  # pymupdf
doc = fitz.open("fonte.pdf")
texto = doc[10].get_text()  # página 10
```

Depois de extraído, ainda é preciso limpar cabeçalhos/rodapés repetidos
(números de página, nome do livro) antes de gravar como fonte.

### Onde colocar o texto

```
backend/app/personas/sources/<persona_id>/<nome-do-ficheiro>.txt
```

Cada ficheiro `.txt` é ingerido automaticamente no arranque do backend (ver
`app/personas/ingest.py`) — uma linha não vazia = uma unidade de citação
(um versículo, um parágrafo, uma frase de um discurso). Não é preciso
preencher `knowledge_chunks` no JSON quando existem ficheiros nesta pasta —
eles têm sempre prioridade.

`knowledge_chunks` no JSON só deve ser usado como fallback temporário,
enquanto o texto integral da fonte primária não é obtido — deixa-o vazio
(`[]`) assim que houver ficheiros em `sources/<persona_id>/`.

## Estrutura do dossiê (metadados)

Antes de codificar, preenche este template. Ele mapeia diretamente para
`backend/app/personas/data/<slug>.json`.

```json
{
  "id": "buda-01",
  "slug": "mentor-caminho-do-meio",
  "display_name": "Mentor do Caminho do Meio",
  "inspired_by": ["Buda", "Sidarta Gautama"],
  "tagline": "IA inspirada nos ensinamentos públicos atribuídos a Sidarta Gautama (Buda), segundo os sutras budistas de domínio público",
  "status": "publico",
  "owner_org": null,
  "avatar": {
    "style": "ilustracao-abstrata",
    "asset": "avatars/caminho-do-meio.svg",
    "voice_provider": "generic-tts",
    "voice_id": "pt-PT-neutral-05"
  },
  "topics": ["sofrimento", "impermanência", "compaixão", "meditação", "caminho do meio"],
  "sources": [
    {
      "title": "Dhammapada — tradução em domínio público",
      "type": "texto_dominio_publico",
      "reference": "texto integral a ingerir em app/personas/sources/buda-01/"
    },
    {
      "title": "Sutras do Cânone Páli — tradução em domínio público",
      "type": "texto_dominio_publico",
      "reference": "citar edição/tradução específica ao expandir o dossiê"
    }
  ],
  "system_prompt_notes": "Tratar com neutralidade religiosa, tal como a persona de Jesus e de Allan Kardec: apresentar como 'segundo os sutras' ou 'atribuído a', nunca como facto objetivo de fé. Focar nas Quatro Nobres Verdades, no Caminho Óctuplo, na impermanência e na compaixão.",
  "disclaimer_overrides": null
}
```

## Campos obrigatórios

- `status`: `"publico"` (default) ou `"licenciado"`. Só passa a `"licenciado"`
  com documentação de licença arquivada (ver `owner_org`).
- `sources[]`: mínimo de 2 fontes públicas verificáveis por persona. Sem
  fontes, a persona não pode ser publicada (ver checklist em
  `LEGAL-GUARDRAILS.md`).
- `avatar.style`: `"ilustracao-abstrata"`, `"avatar-3d-generico"`,
  `"iniciais-tipograficas"` ou `"retrato-ficticio-realista"` (retrato com
  aspeto humano/fotorealista gerado por IA, mas **inventado/genérico** —
  nunca uma tentativa de reconstruir a aparência real e documentada da
  pessoa). Nunca `"foto-realista"` (reprodução real) a não ser que
  `status == "licenciado"` e exista consentimento explícito de imagem.
  `retrato-ficticio-realista` só é apropriado para figuras históricas
  falecidas há muito tempo — nunca para pessoas vivas (regra 6).
- `avatar.voice_provider`: usar sempre uma voz genérica de catálogo do
  fornecedor de TTS. Nunca treinar/clonar uma voz a partir de gravações reais
  da pessoa sem `status == "licenciado"`.

## Guia visual (regra 6)

Duas abordagens válidas, dependendo do estilo escolhido para a plataforma:

**Ilustração abstrata** (`ilustracao-abstrata`) — símbolo/ícone associado à
época e à área de conhecimento da figura, nunca um rosto (ex. Ichthys para
Jesus no séc. I, roda do Dharma para Buda na Índia antiga). Ver
`frontend/public/avatars/*.svg` para exemplos.

**Retrato fotorealista fictício** (`retrato-ficticio-realista`) — decisão
tomada em 2026-07-08: imagem gerada por IA com aspeto humano/fotorealista,
ambientada na época/cultura da figura (traje, cenário, objetos do período),
mas **sem tentar reconstruir a aparência real e documentada da pessoa**
(não gerar a partir de fotografias ou retratos históricos dela como
referência facial). Guardar o ficheiro em
`frontend/public/avatars/<slug>.jpg` (ou `.png`) e apontar `avatar.asset`
para esse caminho — o componente `frontend/src/components/Avatar.tsx`
funciona com qualquer formato de imagem, sem alterações de código.
Aplicável só a figuras históricas falecidas há muito tempo, nunca a
pessoas vivas.

Em ambos os casos, sem `asset` definido a persona cai automaticamente para
as iniciais do nome (fallback mais simples, sempre disponível).

**Otimizar imagens antes de gravar**: imagens geradas por IA vêm tipicamente
com vários MB, mas são mostradas a 56-140px — usar Pillow para redimensionar
antes de colocar em `frontend/public/avatars/`:

```python
from PIL import Image
img = Image.open("original.png").convert("RGB")
w, h = img.size
scale = 500 / max(w, h)
img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
img.save("frontend/public/avatars/<slug>.png", "PNG", optimize=True)
```

Isto reduziu as imagens desta plataforma de ~7MB para ~200KB cada, sem
perda visível ao tamanho em que são mostradas.

## Mentores sintetizados (múltiplas personas)

Um "Mentor combinado" usa uma estrutura diferente — não tem `sources[]`
próprias, mas referencia os `id`s das personas-fonte:

```json
{
  "id": "mentor-sabedoria-universal",
  "type": "sintetizado",
  "display_name": "Mentor de Sabedoria Universal",
  "source_personas": ["etica-compaixao-01", "allan-kardec-01", "buda-01"],
  "synthesis_prompt_notes": "Apresentar sempre como síntese de perspetivas espirituais diferentes (Jesus, Kardec, Buda), atribuindo cada ideia à persona de origem quando relevante e destacando pontos de convergência (ex. compaixão, amor ao próximo) e de divergência doutrinária. Nunca falar em nome de uma única tradição como se fosse a única verdade."
}
```

O backend trata `type: "sintetizado"` de forma diferente em
`app/personas/service.py` — consulta o RAG de cada persona-fonte em paralelo
e passa os excertos atribuídos a um prompt de síntese (ver
`app/core/guardrails.py::build_synthesis_prompt`).
