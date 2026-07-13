const STATEMENTS = [
  {
    title: "Assistentes de IA, inspirados em obras públicas",
    description:
      "Os mentores são assistentes de Inteligência Artificial inspirados em obras e ensinamentos de domínio público tradicionalmente associados às personalidades históricas que os inspiram.",
  },
  {
    title: "Não representam as figuras históricas reais",
    description:
      "Nenhum mentor virtual fala em nome da pessoa real, nem afirma qualquer ligação ou autorização oficial da sua família, espólio ou representantes.",
  },
  {
    title: "Não substituem religião, filosofia ou orientação espiritual",
    description:
      "Esta plataforma não pretende substituir qualquer religião, filosofia ou orientação espiritual, nem servir de aconselhamento pessoal, médico ou legal.",
  },
  {
    title: "Aprendizagem, reflexão e desenvolvimento pessoal",
    description:
      "O objetivo é promover aprendizagem, reflexão e desenvolvimento pessoal — nunca a imitação de identidade.",
  },
];

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WhyTrust() {
  return (
    <section className="why-trust reveal" id="porque-confiar" aria-labelledby="porque-confiar-heading">
      <span className="section-kicker">Transparência</span>
      <h2 className="section-heading" id="porque-confiar-heading">
        Como estes mentores foram desenvolvidos
      </h2>
      <p className="section-subheading">
        Uma biblioteca viva de sabedoria, não uma imitação de identidade.
      </p>
      <div className="why-trust-grid">
        {STATEMENTS.map((item) => (
          <div className="why-trust-item" key={item.title}>
            <span className="why-trust-icon">
              <CheckIcon />
            </span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
