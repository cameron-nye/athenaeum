import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Home from "./page";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt} />
  ),
}));

describe("Home", () => {
  it("renders the heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1 })
    ).toHaveTextContent("To get started, edit the page.tsx file.");
  });

  it("renders the deploy and documentation links", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: /deploy now/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /documentation/i })).toBeInTheDocument();
  });
});
