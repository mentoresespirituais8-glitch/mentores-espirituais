import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import HomePage from "./HomePage";
import * as api from "../lib/api";
import type { PersonaSummary, SynthesisMentorSummary } from "../lib/api";

const PERSONAS: PersonaSummary[] = [
  {
    id: "etica-compaixao-01",
    slug: "mentor-etica-compaixao",
    display_name: "Mentor de Ética e Compaixão",
    inspired_by: ["Jesus Cristo"],
    tagline: "tagline jesus",
    status: "publico",
    avatar: { style: "ilustracao-abstrata", asset: "x.svg", voice_provider: "generic-tts", voice_id: "v1" },
    topics: ["ética"],
  },
  {
    id: "allan-kardec-01",
    slug: "mentor-filosofia-espirita",
    display_name: "Mentor de Filosofia Espírita",
    inspired_by: ["Allan Kardec"],
    tagline: "tagline kardec",
    status: "publico",
    avatar: { style: "ilustracao-abstrata", asset: "x.svg", voice_provider: "generic-tts", voice_id: "v2" },
    topics: ["espiritismo"],
  },
];

const MENTORS: SynthesisMentorSummary[] = [
  {
    id: "mentor-sabedoria-universal",
    slug: "mentor-sabedoria-universal",
    display_name: "Mentor de Sabedoria Universal",
    source_persona_ids: ["etica-compaixao-01", "allan-kardec-01"],
    synthesis_prompt_notes: "notas",
    status: "publico",
    avatar_asset: null,
  },
];

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

describe("HomePage", () => {
  it("lists personas and synthesized mentors once loaded", async () => {
    vi.spyOn(api, "fetchPersonas").mockResolvedValue(PERSONAS);
    vi.spyOn(api, "fetchSynthesizedMentors").mockResolvedValue(MENTORS);

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Mentor de Ética e Compaixão")).toBeInTheDocument();
    });
    expect(screen.getByText("Mentor de Filosofia Espírita")).toBeInTheDocument();
    expect(screen.getByText("Mentor de Sabedoria Universal")).toBeInTheDocument();
    expect(screen.getByText(/Pedido de remoção ou correção/i)).toBeInTheDocument();
  });

  it("shows an error message when the backend is unreachable", async () => {
    vi.spyOn(api, "fetchPersonas").mockRejectedValue(new Error("network error"));
    vi.spyOn(api, "fetchSynthesizedMentors").mockResolvedValue([]);

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText(/Não foi possível ligar ao backend/i)).toBeInTheDocument();
    });
  });

  it("does not render the 'Mentores Sintetizados' section when there are none", async () => {
    vi.spyOn(api, "fetchPersonas").mockResolvedValue(PERSONAS);
    vi.spyOn(api, "fetchSynthesizedMentors").mockResolvedValue([]);

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Mentor de Ética e Compaixão")).toBeInTheDocument();
    });
    expect(screen.queryByText("Mentores Sintetizados")).not.toBeInTheDocument();
  });

  it("filters personas by search text", async () => {
    vi.spyOn(api, "fetchPersonas").mockResolvedValue(PERSONAS);
    vi.spyOn(api, "fetchSynthesizedMentors").mockResolvedValue([]);

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Mentor de Ética e Compaixão")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/com quem gostarias de conversar/i), {
      target: { value: "Kardec" },
    });

    expect(screen.queryByText("Mentor de Ética e Compaixão")).not.toBeInTheDocument();
    expect(screen.getByText("Mentor de Filosofia Espírita")).toBeInTheDocument();
  });

  it("fills the search box when an example pill is clicked", async () => {
    vi.spyOn(api, "fetchPersonas").mockResolvedValue(PERSONAS);
    vi.spyOn(api, "fetchSynthesizedMentors").mockResolvedValue([]);

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Mentor de Ética e Compaixão")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Allan Kardec" }));

    expect(screen.queryByText("Mentor de Ética e Compaixão")).not.toBeInTheDocument();
    expect(screen.getByText("Mentor de Filosofia Espírita")).toBeInTheDocument();
  });

  it("shows an empty state when no persona matches the search", async () => {
    vi.spyOn(api, "fetchPersonas").mockResolvedValue(PERSONAS);
    vi.spyOn(api, "fetchSynthesizedMentors").mockResolvedValue([]);

    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Mentor de Ética e Compaixão")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/com quem gostarias de conversar/i), {
      target: { value: "Napoleão" },
    });

    expect(screen.getByText(/Nenhum mentor corresponde/i)).toBeInTheDocument();
  });
});
