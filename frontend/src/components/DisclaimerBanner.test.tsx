import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DisclaimerBanner from "./DisclaimerBanner";

describe("DisclaimerBanner", () => {
  it("shows the full legal disclaimer text (regra 4 de LEGAL-GUARDRAILS.md)", () => {
    render(<DisclaimerBanner />);
    expect(
      screen.getByText(/simulação criada por Inteligência Artificial/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/não representam/i)).toBeInTheDocument();
    expect(screen.getByText(/afiliação oficial/i)).toBeInTheDocument();
  });

  it("never renders a close/dismiss button", () => {
    render(<DisclaimerBanner />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
