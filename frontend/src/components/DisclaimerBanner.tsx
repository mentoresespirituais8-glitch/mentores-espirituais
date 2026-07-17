const DISCLAIMER_TEXT =
  "Esta personagem é uma simulação criada por Inteligência Artificial com fins educativos. " +
  "As respostas são geradas com base em informação publicamente disponível e não representam " +
  "declarações reais da pessoa nem qualquer afiliação oficial. Plataforma " +
  "destinada a maiores de 18 anos — não substitui aconselhamento médico ou " +
  "psicológico profissional.";

/**
 * Regra 4 (docs/LEGAL-GUARDRAILS.md): tem de estar sempre visível, sem botão
 * de fechar. Não adicionar um estado de "dismissed" aqui.
 */
export default function DisclaimerBanner() {
  return (
    <div className="disclaimer-banner" role="note">
      <span className="disclaimer-icon" aria-hidden="true">
        ⚠
      </span>
      <p>{DISCLAIMER_TEXT}</p>
    </div>
  );
}
