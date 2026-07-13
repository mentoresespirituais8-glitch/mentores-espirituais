import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Avatar from "./Avatar";

describe("Avatar", () => {
  it("renders an image when an assetPath is provided", () => {
    render(<Avatar assetPath="avatars/etica-compaixao.svg" name="Mentor de Ética e Compaixão" />);
    const img = screen.getByRole("img", { name: "Mentor de Ética e Compaixão" });
    expect(img).toHaveAttribute("src", "/avatars/etica-compaixao.svg");
  });

  it("falls back to initials when there is no assetPath (regra 6 — nunca um rosto realista, mesmo no fallback)", () => {
    render(<Avatar assetPath={null} name="Mentor do Caminho do Meio" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("CM")).toBeInTheDocument();
  });
});
