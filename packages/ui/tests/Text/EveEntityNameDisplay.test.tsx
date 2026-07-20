import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { EveEntityNameDisplay } from "../../Text/EveEntityNameDisplay";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

describe("EveEntityNameDisplay", () => {
  it("renders the resolved name when not loading", () => {
    renderWithMantine(<EveEntityNameDisplay name="Jita IV - Moon 4" />);
    expect(screen.getByText("Jita IV - Moon 4")).toBeInTheDocument();
  });

  it("renders a skeleton (and no name text) while loading", () => {
    const { container } = renderWithMantine(
      <EveEntityNameDisplay name="Jita IV - Moon 4" loading />,
    );
    // The skeleton placeholder is shown instead of the resolved name.
    expect(
      container.querySelector(".mantine-Skeleton-root"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Jita IV - Moon 4")).not.toBeInTheDocument();
  });

  it("renders a skeleton while loading even without a name", () => {
    const { container } = renderWithMantine(<EveEntityNameDisplay loading />);
    expect(
      container.querySelector(".mantine-Skeleton-root"),
    ).toBeInTheDocument();
    // The "Unknown" fallback is not rendered as text while loading.
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
  });

  it("renders 'Unknown' when the name is null and not loading", () => {
    renderWithMantine(<EveEntityNameDisplay name={null} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("renders 'Unknown' when the name is undefined and not loading", () => {
    renderWithMantine(<EveEntityNameDisplay />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("forwards extra TextProps onto the underlying Text element", () => {
    renderWithMantine(
      <EveEntityNameDisplay name="The Forge" data-testid="entity-name" />,
    );
    const text = screen.getByTestId("entity-name");
    expect(text).toBeInTheDocument();
    expect(text).toHaveTextContent("The Forge");
  });
});
