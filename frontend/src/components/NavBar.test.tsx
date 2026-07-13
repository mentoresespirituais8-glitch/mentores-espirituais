import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NavBar from "./NavBar";

describe("NavBar", () => {
  it("renders the brand and main navigation links", () => {
    render(<NavBar />);
    expect(screen.getByText("Mentores Espirituais")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "#inicio");
    expect(screen.getByRole("link", { name: "Como Funciona" })).toHaveAttribute("href", "#como-funciona");
  });

  it("toggles the mobile menu open state", () => {
    render(<NavBar />);
    const toggle = screen.getByRole("button", { name: /abrir menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: /fechar menu/i })).toHaveAttribute("aria-expanded", "true");
  });
});
