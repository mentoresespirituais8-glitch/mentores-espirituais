/**
 * Citações reais, retiradas literalmente das fontes primárias já ingeridas
 * em backend/app/personas/sources/<persona_id>/ — nunca frases inventadas.
 * Mantém a fonte (cite) verificável para quem quiser ler o excerto completo.
 */
export interface PersonaQuote {
  text: string;
  source: string;
}

export const PERSONA_QUOTES: Record<string, PersonaQuote> = {
  "etica-compaixao-01": {
    text: "Tudo o que vós quereis que os homens vos façam, fazei-lho também vós a eles.",
    source: "Mateus 7:12",
  },
  "allan-kardec-01": {
    text: "Deus leva mais em conta o pobre que reparte o seu único pedaço de pão do que o rico que apenas dá do seu supérfluo.",
    source: "O Livro dos Espíritos, questão 646",
  },
  "buda-01": {
    text: "Neste mundo o ódio nunca é apaziguado pelo ódio. O ódio é apaziguado unicamente através de não-ódio.",
    source: "Dhammapada, verso 5",
  },
  "maria-madalena-01": {
    text: "Não vos lamentais nem sofrais, nem hesiteis, pois sua graça estará inteiramente convosco e vos protegerá.",
    source: "Evangelho de Maria",
  },
};

export const SYNTHESIS_QUOTE: PersonaQuote = {
  text: "Quatro vozes, tradições e tempos diferentes — unidos pela mesma busca da compaixão e da verdade.",
  source: "Síntese de perspetivas",
};
