import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import type { PersonaSummary } from "../lib/api";

/**
 * Hero da homepage. Quando recebe as personas, mostra a "faixa de presença":
 * os retratos dos mentores com um indicador de disponibilidade a pulsar —
 * a sensação de que estão mesmo ali, prontos para atender uma chamada.
 */
export default function Hero({ personas = [] }: { personas?: PersonaSummary[] }) {
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
          <a href="#demonstracoes" className="btn btn-ghost">
            Ver Demonstração
          </a>
        </div>
        {personas.length > 0 && (
          <a href="#mentores" className="hero-presence" aria-label="Ver mentores disponíveis">
            <span className="hero-presence-avatars">
              {personas.slice(0, 4).map((p) => (
                <Avatar
                  key={p.id}
                  assetPath={p.avatar.asset}
                  name={p.display_name}
                  className="hero-presence-avatar"
                />
              ))}
            </span>
            <span className="hero-presence-text">
              <span className="presence-dot" aria-hidden="true" />
              {personas.length} mentores disponíveis agora
            </span>
          </a>
        )}
      </div>
    </section>
  );
}
