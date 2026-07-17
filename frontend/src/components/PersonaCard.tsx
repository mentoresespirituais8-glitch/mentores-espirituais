import { Link } from "react-router-dom";
import type { PersonaSummary } from "../lib/api";
import Avatar from "./Avatar";
import { PERSONA_QUOTES } from "../lib/quotes";
import { PERSONA_SEALS } from "../lib/seals";

/**
 * Cartão de mentor. Com `onOpenProfile`, clicar no cartão abre o modal de
 * perfil (biografia + exemplo de conversa) e o CTA "Conversar" continua a
 * levar diretamente à chamada. Sem a prop, mantém o comportamento original
 * (cartão inteiro é o link para a chamada).
 */
export default function PersonaCard({
  persona,
  onOpenProfile,
}: {
  persona: PersonaSummary;
  onOpenProfile?: (persona: PersonaSummary) => void;
}) {
  const quote = PERSONA_QUOTES[persona.id];
  const seal = PERSONA_SEALS[persona.id];

  const inner = (
    <>
      <div className="persona-card-media">
        {seal && (
          <span className="persona-card-seal" aria-hidden="true">
            {seal}
          </span>
        )}
        <span className="card-presence">
          <span className="presence-dot" aria-hidden="true" />
          Disponível
        </span>
        <Avatar assetPath={persona.avatar.asset} name={persona.display_name} className="avatar-featured" />
        {quote && (
          <div className="persona-card-quote">
            <blockquote>
              “{quote.text}”
              <cite>{quote.source}</cite>
            </blockquote>
          </div>
        )}
      </div>
      <div className="persona-card-body">
        <h3>{persona.display_name}</h3>
        <p className="persona-inspired-by">Inspirado em {persona.inspired_by.join(" / ")}</p>
        <p className="persona-tagline">{persona.tagline}</p>
        <div className="persona-topics">
          {persona.topics.map((topic) => (
            <span key={topic} className="topic-pill">
              {topic}
            </span>
          ))}
        </div>
        {persona.status === "licenciado" && (
          <span className="badge-licenciado">Persona licenciada oficialmente</span>
        )}
      </div>
    </>
  );

  if (!onOpenProfile) {
    return (
      <Link to={`/chamada/${persona.id}`} className="persona-card">
        {inner}
        <span className="card-cta">
          Conversar
          <span className="card-cta-arrow" aria-hidden="true">→</span>
        </span>
      </Link>
    );
  }

  return (
    <article
      className="persona-card persona-card-clickable"
      role="button"
      tabIndex={0}
      aria-label={`Ver perfil de ${persona.display_name}`}
      onClick={() => onOpenProfile(persona)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenProfile(persona);
        }
      }}
    >
      {inner}
      <div className="persona-card-actions">
        <span className="card-cta card-cta-profile">Ver perfil</span>
        <Link
          to={`/chamada/${persona.id}`}
          className="card-cta"
          onClick={(e) => e.stopPropagation()}
        >
          Iniciar chamada
          <span className="card-cta-arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
