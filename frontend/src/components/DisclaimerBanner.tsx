import { useState } from "react";

const DISCLAIMER_TEXT =
  "Esta personagem é uma simulação criada por Inteligência Artificial com fins educativos. " +
  "As respostas são geradas com base em informação publicamente disponível e não representam " +
  "declarações reais da pessoa nem qualquer afiliação oficial. Plataforma " +
  "destinada a maiores de 18 anos — não substitui aconselhamento médico ou " +
  "psicológico profissional.";

const DISCLAIMER_SHORT =
  "Simulação por IA com fins educativos · 18+ · não substitui apoio profissional.";

/**
 * Regra 4 (docs/LEGAL-GUARDRAILS.md): tem de estar sempre visível, sem botão
 * de fechar. Não adicionar um estado de "dismissed" aqui.
 *
 * Em ecrãs pequenos mostra-se a versão curta (sempre visível) com um botão
 * "Ler tudo" que expande o texto completo — o aviso nunca desaparece, apenas
 * ocupa menos espaço no telemóvel. Em ecrãs largos aparece sempre completo
 * (controlado por CSS).
 */
export default function DisclaimerBanner() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`disclaimer-banner${expanded ? " disclaimer-expanded" : ""}`}
      role="note"
    >
      <span className="disclaimer-icon" aria-hidden="true">
        ⚠
      </span>
      <p className="disclaimer-full">{DISCLAIMER_TEXT}</p>
      <p className="disclaimer-short">{DISCLAIMER_SHORT}</p>
      <button
        type="button"
        className="disclaimer-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? "Reduzir" : "Ler tudo"}
      </button>
    </div>
  );
}
