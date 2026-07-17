import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import { PERSONA_QUOTES, SYNTHESIS_QUOTE } from "../lib/quotes";
import { PERSONA_PROFILES, SYNTHESIS_PROFILE } from "../lib/profiles";

export interface ProfileTarget {
  id: string;
  displayName: string;
  inspiredBy: string[];
  avatarAsset: string | null;
  kind: "persona" | "mentor";
}

/**
 * Modal com o perfil completo de um mentor: biografia, especialidades, frase
 * marcante e uma conversa de exemplo no tom próprio desse mentor — para o
 * utilizador sentir a personalidade antes de iniciar a chamada.
 */
export default function PersonaProfileModal({
  target,
  onClose,
}: {
  target: ProfileTarget;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const profile = target.kind === "mentor" ? SYNTHESIS_PROFILE : PERSONA_PROFILES[target.id];
  const quote = target.kind === "mentor" ? SYNTHESIS_QUOTE : PERSONA_QUOTES[target.id];

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // Bloqueia o scroll da página atrás do modal enquanto está aberto.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="profile-modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="profile-modal-close"
          onClick={onClose}
          aria-label="Fechar perfil"
        >
          ×
        </button>

        <header className="profile-modal-header">
          <Avatar
            assetPath={target.avatarAsset}
            name={target.displayName}
            eager
            className="profile-modal-avatar"
          />
          <div>
            <h3 id="profile-modal-title">{target.displayName}</h3>
            {target.inspiredBy.length > 0 && (
              <p className="persona-inspired-by">Inspirado em {target.inspiredBy.join(" / ")}</p>
            )}
          </div>
        </header>

        {quote && (
          <blockquote className="profile-modal-quote">
            “{quote.text}”
            <cite>{quote.source}</cite>
          </blockquote>
        )}

        {profile && (
          <>
            <p className="profile-modal-bio">{profile.bio}</p>

            <div className="profile-modal-specialties">
              <h4>Especialidades</h4>
              <div className="persona-topics">
                {profile.specialties.map((s) => (
                  <span key={s} className="topic-pill">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="profile-modal-demo">
              <h4>Exemplo de conversa</h4>
              <div className="demo-chat" aria-label={`Exemplo de conversa com ${target.displayName}`}>
                {profile.demo.map((turn, i) => (
                  <div key={i} className={`demo-row demo-row-${turn.role}`}>
                    {turn.role === "assistant" && (
                      <Avatar
                        assetPath={target.avatarAsset}
                        name={target.displayName}
                        className="demo-avatar"
                      />
                    )}
                    <div className={`demo-bubble demo-bubble-${turn.role}`}>{turn.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="profile-modal-actions">
          <Link to={`/chamada/${target.id}`} className="btn btn-primary">
            Iniciar chamada
          </Link>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
