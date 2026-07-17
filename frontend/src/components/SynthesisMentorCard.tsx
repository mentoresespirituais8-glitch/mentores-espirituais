import { Link } from "react-router-dom";
import type { PersonaSummary, SynthesisMentorSummary } from "../lib/api";
import Avatar from "./Avatar";
import { SYNTHESIS_QUOTE } from "../lib/quotes";
import { SYNTHESIS_SEAL } from "../lib/seals";

export default function SynthesisMentorCard({
  mentor,
  allPersonas,
  onOpenProfile,
}: {
  mentor: SynthesisMentorSummary;
  allPersonas: PersonaSummary[];
  onOpenProfile?: (mentor: SynthesisMentorSummary) => void;
}) {
  const sourceNames = mentor.source_persona_ids
    .map((id) => allPersonas.find((p) => p.id === id)?.display_name)
    .filter((name): name is string => Boolean(name));

  const inner = (
    <>
      <div className="persona-card-media">
        <span className="persona-card-seal" aria-hidden="true">
          {SYNTHESIS_SEAL}
        </span>
        <span className="card-presence">
          <span className="presence-dot" aria-hidden="true" />
          Disponível
        </span>
        <Avatar
          assetPath={mentor.avatar_asset}
          name={mentor.display_name}
          className="avatar-featured persona-avatar-synthesis"
        />
        <div className="persona-card-quote">
          <blockquote>
            “{SYNTHESIS_QUOTE.text}”
            <cite>{SYNTHESIS_QUOTE.source}</cite>
          </blockquote>
        </div>
      </div>
      <div className="persona-card-body">
        <h3>{mentor.display_name}</h3>
        <p className="persona-tagline">
          Síntese de perspetivas de: {sourceNames.join(", ") || "várias personas"}
        </p>
        <span className="badge-sintetizado">Mentor sintetizado</span>
      </div>
    </>
  );

  if (!onOpenProfile) {
    return (
      <Link to={`/chamada/${mentor.id}`} className="persona-card persona-card-synthesis">
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
      className="persona-card persona-card-synthesis persona-card-clickable"
      role="button"
      tabIndex={0}
      aria-label={`Ver perfil de ${mentor.display_name}`}
      onClick={() => onOpenProfile(mentor)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenProfile(mentor);
        }
      }}
    >
      {inner}
      <div className="persona-card-actions">
        <span className="card-cta card-cta-profile">Ver perfil</span>
        <Link
          to={`/chamada/${mentor.id}`}
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
