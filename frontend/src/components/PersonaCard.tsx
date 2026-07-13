import { Link } from "react-router-dom";
import type { PersonaSummary } from "../lib/api";
import Avatar from "./Avatar";
import { PERSONA_QUOTES } from "../lib/quotes";
import { PERSONA_SEALS } from "../lib/seals";

export default function PersonaCard({ persona }: { persona: PersonaSummary }) {
  const quote = PERSONA_QUOTES[persona.id];
  const seal = PERSONA_SEALS[persona.id];

  return (
    <Link to={`/chamada/${persona.id}`} className="persona-card">
      <div className="persona-card-media">
        {seal && (
          <span className="persona-card-seal" aria-hidden="true">
            {seal}
          </span>
        )}
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
        <span className="card-cta">
          Conversar
          <span className="card-cta-arrow" aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
