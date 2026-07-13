import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import PersonaCard from "./PersonaCard";
import type { PersonaSummary } from "../lib/api";

const BASE_PERSONA: PersonaSummary = {
  id: "etica-compaixao-01",
  slug: "mentor-etica-compaixao",
  display_name: "Mentor de Ética e Compaixão",
  inspired_by: ["Jesus Cristo"],
  tagline: "IA inspirada nos ensinamentos públicos atribuídos a Jesus Cristo",
  status: "publico",
  avatar: { style: "ilustracao-abstrata", asset: "x.svg", voice_provider: "generic-tts", voice_id: "pt-PT-neutral-01" },
  topics: ["ética", "compaixão"],
};

function renderCard(persona: PersonaSummary) {
  return render(
    <MemoryRouter>
      <PersonaCard persona={persona} />
    </MemoryRouter>
  );
}

describe("PersonaCard", () => {
  it("shows the persona name, tagline and topics", () => {
    renderCard(BASE_PERSONA);
    expect(screen.getByText("Mentor de Ética e Compaixão")).toBeInTheDocument();
    expect(screen.getByText(/inspirada nos ensinamentos/i)).toBeInTheDocument();
    expect(screen.getByText("ética")).toBeInTheDocument();
    expect(screen.getByText("compaixão")).toBeInTheDocument();
  });

  it("highlights the real figure(s) that inspired the persona", () => {
    renderCard(BASE_PERSONA);
    expect(screen.getByText("Inspirado em Jesus Cristo")).toBeInTheDocument();
  });

  it("joins multiple inspiring figures with a separator", () => {
    renderCard({ ...BASE_PERSONA, inspired_by: ["Buda", "Sidarta Gautama"] });
    expect(screen.getByText("Inspirado em Buda / Sidarta Gautama")).toBeInTheDocument();
  });

  it("links to the persona's call page", () => {
    renderCard(BASE_PERSONA);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/chamada/etica-compaixao-01");
  });

  it("shows the licensed badge only when status is 'licenciado'", () => {
    renderCard(BASE_PERSONA);
    expect(screen.queryByText(/licenciada oficialmente/i)).not.toBeInTheDocument();

    renderCard({ ...BASE_PERSONA, status: "licenciado" });
    expect(screen.getByText(/licenciada oficialmente/i)).toBeInTheDocument();
  });
});
