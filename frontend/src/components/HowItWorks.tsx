const STEPS = [
  {
    label: "Passo 1",
    description: "Escolha um mentor.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Passo 2",
    description: "Faça qualquer pergunta.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 5h16v10H8l-4 4V5z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Passo 3",
    description: "Receba respostas inspiradas no legado intelectual desse mentor.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 014 18.5v-13z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 001.5-1.5v-13z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section className="how-it-works reveal" id="como-funciona" aria-labelledby="como-funciona-heading">
      <span className="section-kicker">Processo</span>
      <h2 className="section-heading" id="como-funciona-heading">
        Como funciona
      </h2>
      <p className="section-subheading">
        Três passos simples entre si e milénios de pensamento espiritual.
      </p>
      <div className="how-it-works-grid">
        {STEPS.map((step, i) => (
          <div className="how-step-wrap" key={step.label}>
            <div className="how-step">
              <span className="how-step-icon">{step.icon}</span>
              <span className="how-step-label">{step.label}</span>
              <p>{step.description}</p>
            </div>
            {i < STEPS.length - 1 && (
              <span className="how-step-connector" aria-hidden="true">
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
