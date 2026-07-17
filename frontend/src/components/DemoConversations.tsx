import { Link } from "react-router-dom";
import Avatar from "./Avatar";
import { HOMEPAGE_DEMOS } from "../lib/profiles";
import type { PersonaSummary } from "../lib/api";

/**
 * Secção de demonstrações da homepage: 4 conversas curtas e reais em tom,
 * cada uma no estilo próprio do seu mentor — para o visitante compreender
 * imediatamente a experiência antes de escolher um mentor (ponto 9 do
 * documento de visão).
 */
export default function DemoConversations({ personas }: { personas: PersonaSummary[] }) {
  if (personas.length === 0) return null;

  return (
    <section className="demo-section reveal" id="demonstracoes" aria-labelledby="demos-heading">
      <span className="section-kicker">Sinta a experiência</span>
      <h2 className="section-heading" id="demos-heading">
        Conversas que tocam de verdade
      </h2>
      <p className="section-subheading">
        Cada mentor tem uma voz própria. Estes são exemplos reais do estilo de cada um — clique num
        para continuar a conversa.
      </p>

      <div className="demo-grid">
        {HOMEPAGE_DEMOS.map((demo, index) => {
          const persona = personas.find((p) => p.id === demo.personaId);
          if (!persona) return null;
          return (
            <Link
              key={demo.personaId}
              to={`/chamada/${persona.id}`}
              className="demo-card"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <div className="demo-card-header">
                <Avatar
                  assetPath={persona.avatar.asset}
                  name={persona.display_name}
                  className="demo-avatar"
                />
                <div>
                  <span className="demo-card-name">{persona.display_name}</span>
                  <span className="demo-card-sub">Inspirado em {persona.inspired_by.join(" / ")}</span>
                </div>
              </div>
              <div className="demo-chat">
                <div className="demo-row demo-row-user">
                  <div className="demo-bubble demo-bubble-user">{demo.question}</div>
                </div>
                <div className="demo-row demo-row-assistant">
                  <div className="demo-bubble demo-bubble-assistant">{demo.answer}</div>
                </div>
              </div>
              <span className="demo-card-cta">
                Continuar esta conversa
                <span className="card-cta-arrow" aria-hidden="true">→</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
