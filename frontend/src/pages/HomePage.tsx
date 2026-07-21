import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";
import SiteBackground from "../components/SiteBackground";
import Hero from "../components/Hero";
import Transition from "../components/Transition";
import SearchBar from "../components/SearchBar";
import HowItWorks from "../components/HowItWorks";
import WhyTrust from "../components/WhyTrust";
import PersonaCard from "../components/PersonaCard";
import SynthesisMentorCard from "../components/SynthesisMentorCard";
import DemoConversations from "../components/DemoConversations";
import PersonaProfileModal, { type ProfileTarget } from "../components/PersonaProfileModal";
import { fetchPersonas, fetchSynthesizedMentors, type PersonaSummary, type SynthesisMentorSummary } from "../lib/api";
import { useScrollReveal } from "../lib/useScrollReveal";

function matches(query: string, ...fields: (string | string[])[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => {
    const text = Array.isArray(field) ? field.join(" ") : field;
    return text.toLowerCase().includes(q);
  });
}

export default function HomePage() {
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [mentors, setMentors] = useState<SynthesisMentorSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [profileTarget, setProfileTarget] = useState<ProfileTarget | null>(null);

  function openPersonaProfile(persona: PersonaSummary) {
    setProfileTarget({
      id: persona.id,
      displayName: persona.display_name,
      inspiredBy: persona.inspired_by,
      avatarAsset: persona.avatar.asset,
      kind: "persona",
    });
  }

  function openMentorProfile(mentor: SynthesisMentorSummary) {
    setProfileTarget({
      id: mentor.id,
      displayName: mentor.display_name,
      inspiredBy: [],
      avatarAsset: mentor.avatar_asset,
      kind: "mentor",
    });
  }

  useEffect(() => {
    Promise.all([fetchPersonas(), fetchSynthesizedMentors()])
      .then(([personasResult, mentorsResult]) => {
        setPersonas(personasResult);
        setMentors(mentorsResult);
      })
      .catch(() => setError("Não foi possível ligar ao backend. Confirma que está a correr em http://localhost:8000."))
      .finally(() => setLoading(false));
  }, []);

  const filteredPersonas = useMemo(
    () =>
      personas.filter((p) =>
        matches(search, p.display_name, p.inspired_by, p.topics, p.tagline)
      ),
    [personas, search]
  );

  const filteredMentors = useMemo(
    () => mentors.filter((m) => matches(search, m.display_name)),
    [mentors, search]
  );

  useScrollReveal([loading]);

  return (
    <>
      <a href="#mentores" className="skip-link">
        Saltar para os mentores
      </a>
      <SiteBackground />
      <NavBar />
      <Hero personas={personas} />
      <Transition />

      <main className="home-page">
        <DemoConversations personas={personas} />

        <SearchBar value={search} onChange={setSearch} />

        {error && <p className="error-message">{error}</p>}

        <section id="mentores" className="reveal" aria-labelledby="mentores-heading">
          <span className="section-kicker">Os mentores</span>
          <h2 className="section-heading" id="mentores-heading">
            Escolha o mentor que deseja conhecer
          </h2>
          <p className="section-subheading">
            Cada mentor virtual foi desenvolvido com base em obras e ensinamentos historicamente
            associados à personalidade que o inspira. O objetivo é proporcionar uma experiência
            educativa, respeitosa e enriquecedora.
          </p>

          {!loading && filteredPersonas.length === 0 && (
            <p className="persona-empty-state">Nenhum mentor corresponde a essa pesquisa.</p>
          )}

          <div className="persona-grid">
            {/* Enquanto o backend acorda/responde, cartões-esqueleto a pulsar
                no lugar dos mentores — nunca uma zona vazia. */}
            {loading &&
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="persona-card skeleton-card" aria-hidden="true">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-line skeleton-line-wide" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line skeleton-line-short" />
                </div>
              ))}
            {filteredPersonas.map((persona) => (
              <PersonaCard key={persona.id} persona={persona} onOpenProfile={openPersonaProfile} />
            ))}
          </div>

          {filteredMentors.length > 0 && (
            <>
              <h2 className="section-heading">Mentores Sintetizados</h2>
              <div className="persona-grid">
                {filteredMentors.map((mentor) => (
                  <SynthesisMentorCard
                    key={mentor.id}
                    mentor={mentor}
                    allPersonas={personas}
                    onOpenProfile={openMentorProfile}
                  />
                ))}
              </div>
            </>
          )}
        </section>

        <HowItWorks />
        <WhyTrust />

        <footer className="home-footer" id="contacto">
          <p className="home-footer-quote">"O conhecimento ganha vida quando é partilhado."</p>
          <div className="home-footer-bottom">
            <span>
              © Mentores Espirituais — IA inspirada em figuras históricas, sem afiliação oficial.
              Para maiores de 18 anos.
            </span>
            <div className="home-footer-links">
              <Link to="/metodologia">Como funcionam os mentores</Link>
              <Link to="/pedido-remocao">Contacto / pedido de remoção ou correção</Link>
            </div>
          </div>
        </footer>
      </main>

      {profileTarget && (
        <PersonaProfileModal target={profileTarget} onClose={() => setProfileTarget(null)} />
      )}
    </>
  );
}
