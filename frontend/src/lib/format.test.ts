import { describe, expect, it } from "vitest";
import { initials } from "./format";

describe("initials", () => {
  it("ignores generic 'Mentor de/do' filler words", () => {
    // Regressão: antes desta correção, todas as personas mostravam "MD"
    // porque a função pegava sempre nas 2 primeiras palavras.
    expect(initials("Mentor do Caminho do Meio")).toBe("CM");
    expect(initials("Mentor de Ética e Compaixão")).toBe("ÉC");
  });

  it("produces distinct initials for different personas", () => {
    const names = [
      "Mentor do Caminho do Meio",
      "Mentor de Ética e Compaixão",
      "Mentor de Filosofia Espírita",
      "Mentora do Reino Interior",
    ];
    const result = new Set(names.map(initials));
    expect(result.size).toBe(names.length);
  });

  it("falls back to the first two words when everything is filtered out", () => {
    expect(initials("Mentor de")).toBe("MD");
  });

  it("handles a single-word name", () => {
    expect(initials("Buda")).toBe("B");
  });
});
