/**
 * Perfis ricos dos mentores (biografia, especialidades, conversa de exemplo)
 * mostrados no modal de perfil (PersonaProfileModal) e nas demonstrações da
 * homepage (DemoConversations).
 *
 * As conversas de exemplo são estáticas — escritas à mão no tom de voz de cada
 * mentor (ver system_prompt_notes em backend/app/personas/data/*.json) para o
 * visitante sentir a personalidade única de cada um ANTES de iniciar. Seguem
 * as mesmas regras dos guardrails: nunca alegam ser a pessoa real e citam as
 * fontes quando relevante.
 */

export interface DemoTurn {
  role: "user" | "assistant";
  text: string;
}

export interface PersonaProfile {
  /** Biografia curta: sobre a figura que inspira e o que este mentor de IA estuda. */
  bio: string;
  /** Especialidades — mais descritivas do que os topics técnicos do backend. */
  specialties: string[];
  /** Conversa de exemplo que demonstra a personalidade única deste mentor. */
  demo: DemoTurn[];
}

export const PERSONA_PROFILES: Record<string, PersonaProfile> = {
  "etica-compaixao-01": {
    bio: "Inspirado nos ensinamentos atribuídos a Jesus Cristo nos Evangelhos (tradução Almeida, domínio público). Este mentor de IA estuda as parábolas, o Sermão da Montanha e o mandamento do amor — e responde como um mestre que acolhe primeiro e ensina depois, muitas vezes devolvendo uma pergunta que convida a olhar para dentro.",
    specialties: [
      "Perdão e reconciliação",
      "Amor ao próximo",
      "Compaixão nas relações",
      "Sentido do sofrimento",
      "Generosidade e serviço",
    ],
    demo: [
      {
        role: "user",
        text: "Magoaram-me profundamente e não consigo perdoar. Isso faz de mim má pessoa?",
      },
      {
        role: "assistant",
        text: "Não faz de ti má pessoa — faz de ti alguém que ainda carrega a ferida. Nos Evangelhos, quando Pedro perguntou quantas vezes devia perdoar, a resposta foi setenta vezes sete: não porque seja fácil, mas porque o perdão é um caminho que se percorre, não um gesto único. Deixa-me perguntar-te: o que te pesa mais — o que te fizeram, ou o que essa mágoa está a fazer de ti?",
      },
    ],
  },
  "allan-kardec-01": {
    bio: "Inspirado na obra de Allan Kardec, o educador francês que codificou o Espiritismo em 'O Livro dos Espíritos' (1857, domínio público). Este mentor de IA raciocina como o próprio Kardec ensinava: com método, lógica e serenidade, tratando as grandes questões da alma como matéria de estudo e não de dogma.",
    specialties: [
      "Sentido da vida e da morte",
      "Progresso moral",
      "Razão aplicada à fé",
      "Justiça e responsabilidade",
      "Consolo fundamentado",
    ],
    demo: [
      {
        role: "user",
        text: "Porque é que pessoas boas sofrem tanto, se existe justiça?",
      },
      {
        role: "assistant",
        text: "Examinemos a questão com calma, como Kardec gostava de fazer. 'O Livro dos Espíritos' propõe que o sofrimento raramente é castigo — é mais frequentemente instrumento de progresso, ocasião de crescer em paciência e entendimento. A justiça, nessa perspetiva, não se mede numa só vida, mas num percurso longo da alma. Repara: a tua pergunta já é um ato de raciocínio moral. Queres que analisemos juntos algum sofrimento concreto que te inquieta?",
      },
    ],
  },
  "buda-01": {
    bio: "Inspirado nos ensinamentos atribuídos a Sidarta Gautama, o Buda, registados no Dhammapada — um dos textos mais antigos da tradição budista. Este mentor de IA fala como o texto que estuda: frases curtas, imagens da natureza, contrastes que iluminam. Nunca tem pressa.",
    specialties: [
      "Serenidade da mente",
      "Impermanência e desapego",
      "Origem do sofrimento",
      "Atenção ao presente",
      "Compaixão sem esforço",
    ],
    demo: [
      {
        role: "user",
        text: "A minha cabeça não para. Estou sempre ansioso com o que pode correr mal.",
      },
      {
        role: "assistant",
        text: "A mente agitada é como água revolta: não vês o fundo, mas o fundo está lá. Diz o Dhammapada que a mente treinada traz mais paz do que a chuva traz à terra seca. O sábio não luta contra os pensamentos; observa-os, como quem vê nuvens passar. Repara: neste momento, enquanto lês isto — o que correu mal? Começa por este instante. É o único que existe.",
      },
    ],
  },
  "maria-madalena-01": {
    bio: "Inspirada no Evangelho de Maria, um texto gnóstico raro do século II tradicionalmente associado a Maria Madalena. Esta mentora de IA fala de um caminho interior: a serenidade não se encontra fora, encontra-se no silêncio de quem aprende a escutar-se. O seu tom é suave, contemplativo e sem julgamento.",
    specialties: [
      "Vida interior e contemplação",
      "Coragem na adversidade",
      "Paz para além do medo",
      "Autoconhecimento",
      "Confiança serena",
    ],
    demo: [
      {
        role: "user",
        text: "Sinto que ninguém me compreende verdadeiramente. Estou sempre a fingir que estou bem.",
      },
      {
        role: "assistant",
        text: "Escuto-te — e não estás sozinho nesse silêncio. O Evangelho de Maria ensina que a paz não vem de sermos compreendidos por todos, mas de deixarmos de estar em guerra connosco próprios. 'Que a sua paz esteja convosco', diz o texto — uma paz que nasce dentro. Talvez a pergunta não seja quem te compreende, mas: quando foi a última vez que te escutaste sem fingir? Podes começar aqui, comigo. Sem máscaras.",
      },
    ],
  },
};

export const SYNTHESIS_PROFILE: PersonaProfile = {
  bio: "Um mentor diferente de todos os outros: reúne as perspetivas de Jesus, Buda, Allan Kardec e Maria Madalena sobre a mesma questão — atribuindo sempre cada ideia à sua origem e mostrando onde as tradições convergem e onde divergem. Ideal para quem quer comparar caminhos em vez de seguir apenas um.",
  specialties: [
    "Comparação entre tradições",
    "Convergências e divergências",
    "Grandes questões da vida",
    "Sabedoria universal",
  ],
  demo: [
    {
      role: "user",
      text: "O que é a felicidade, afinal?",
    },
    {
      role: "assistant",
      text: "Quatro tradições, quatro respostas que se tocam. Uma perspetiva inspirada em Buda diria: a felicidade nasce da mente serena, não das circunstâncias. Uma inspirada em Jesus apontaria para o amor dado, mais do que recebido. Kardec falaria do progresso — a alegria de nos tornarmos melhores do que ontem. E o Evangelho de Maria sugeriria a paz interior de quem se conhece. Repara na convergência: nenhuma coloca a felicidade nas coisas. Qual destes caminhos te faz mais sentido hoje?",
    },
  ],
};

/**
 * Demonstrações curtas da homepage — 1 pergunta + 1 resposta, escolhidas para
 * o visitante sentir imediatamente a experiência e a diferença de estilo
 * entre mentores. Diferentes das demos dos perfis para não repetir conteúdo.
 */
export interface HomepageDemo {
  personaId: string;
  question: string;
  answer: string;
}

export const HOMEPAGE_DEMOS: HomepageDemo[] = [
  {
    personaId: "buda-01",
    question: "Perdi o emprego e sinto que perdi o chão.",
    answer: "Tudo o que nasce, transforma-se — diz o Dhammapada. O chão que perdeste era uma margem; a vida é o rio. Respira. Onde estás agora é já um lugar para começar.",
  },
  {
    personaId: "etica-compaixao-01",
    question: "Como posso ajudar alguém que não pede ajuda?",
    answer: "O bom samaritano não esperou que lhe pedissem — aproximou-se. Ama primeiro, pergunta depois. Às vezes a ajuda começa por estar presente, sem condições.",
  },
  {
    personaId: "allan-kardec-01",
    question: "A morte de alguém que amo tem algum sentido?",
    answer: "Kardec responderia com serenidade: a morte é uma transformação, não um fim. O amor que construíste não se desfaz — e a saudade, examinada com calma, é prova de que esse laço foi real.",
  },
  {
    personaId: "maria-madalena-01",
    question: "Tenho medo de não ser suficiente.",
    answer: "Esse medo não és tu — é uma voz que aprendeste a escutar. O Evangelho de Maria fala de voltar ao centro, onde a paz já existe. Não precisas de ser mais para mereceres estar em paz.",
  },
];
