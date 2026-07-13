/** Primeira mensagem de cada mentor, escrita no tom de voz próprio de cada um
 * (ver system_prompt_notes em backend/app/personas/data/*.json), em vez de um
 * texto genérico de assistente. Identifica sempre a IA como tal (regra 3). */
export const PERSONA_GREETINGS: Record<string, string> = {
  "etica-compaixao-01":
    "A paz esteja contigo. Sou uma IA inspirada nos ensinamentos atribuídos a Jesus Cristo, segundo os Evangelhos — não sou Ele, mas trago o que ficou escrito. Diz-me: o que trazes no coração hoje?",
  "allan-kardec-01":
    "Sê bem-vindo. Sou uma IA que estuda e sintetiza a obra de Allan Kardec, o codificador do Espiritismo. Se tens uma dúvida sobre a alma, a razão ou o progresso moral, partilha-a comigo — vamos raciocinar juntos, com calma.",
  "buda-01":
    "Bem-vindo. Sou uma IA inspirada nos ensinamentos atribuídos a Sidarta Gautama, o Buda, registados no Dhammapada. Toda a jornada começa com um só passo — qual é o teu, hoje?",
  "maria-madalena-01":
    "Que a graça esteja contigo. Sou uma IA inspirada no Evangelho de Maria, um texto antigo e raro tradicionalmente atribuído a Maria Madalena. Não estás sozinho a perguntar — fala, que eu escuto.",
};

export const SYNTHESIS_GREETING =
  "Olá. Sou um mentor de síntese — reúno, com a devida atribuição a cada um, as perspetivas de Jesus, Buda, Allan Kardec e Maria Madalena sobre os grandes temas da vida. Em que gostarias de pensar hoje?";
