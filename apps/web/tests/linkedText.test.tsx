import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import { LinkedText } from "~/components/Text/LinkedText";

function renderText(text: string) {
  return render(
    <MantineProvider>
      <p data-testid="text">
        <LinkedText text={text} />
      </p>
    </MantineProvider>,
  );
}

describe("LinkedText", () => {
  it("turns showinfo and site links into site links, keeping the text", () => {
    renderText(
      'Increases the ship\'s <a href="/dogma/attribute/37">Maximum Velocity</a> per <a href="showinfo:20528">Minmatar Freighter</a> level.',
    );
    expect(screen.getByTestId("text")).toHaveTextContent(
      "Increases the ship's Maximum Velocity per Minmatar Freighter level.",
    );
    expect(
      screen.getByRole("link", { name: "Maximum Velocity" }),
    ).toHaveAttribute("href", "/dogma/attribute/37");
    expect(
      screen.getByRole("link", { name: "Minmatar Freighter" }),
    ).toHaveAttribute("href", "/type/20528");
  });

  it("shows a link that leaves the site as plain text", () => {
    renderText('See <a href="https://example.com">elsewhere</a> for more.');
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByTestId("text")).toHaveTextContent(
      "See elsewhere for more.",
    );
  });

  it("renders text without links unchanged", () => {
    renderText("Requires a low power slot");
    expect(screen.getByTestId("text")).toHaveTextContent(
      "Requires a low power slot",
    );
  });
});
