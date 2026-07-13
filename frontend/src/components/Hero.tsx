import { Link } from "react-router-dom";

export default function Hero() {
  return (
    <section className="hero" id="inicio">
      <div className="hero-content reveal-in">
        <span className="hero-eyebrow">IA inspirada em figuras históricas</span>
        <h1>Converse com os grandes mentores da humanidade através da Inteligência Artificial</h1>
        <p className="hero-subtitle">
          Explore mentores virtuais inspirados em obras e ensinamentos de domínio público para
          promover reflexão, aprendizagem e desenvolvimento pessoal.
        </p>
        <div className="hero-actions">
          <Link to="/chamada/mentor-sabedoria-universal" className="btn btn-primary">
            Começar Conversa
          </Link>
          <a href="#mentores" className="btn btn-secondary">
            Conhecer os Mentores
          </a>
          <a href="#como-funciona" className="btn btn-ghost">
            Ver Demonstração
          </a>
        </div>
      </div>
    </section>
  );
}
