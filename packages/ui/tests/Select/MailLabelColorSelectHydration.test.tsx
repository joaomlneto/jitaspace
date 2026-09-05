import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";

// Deliberately NOT mocking @jitaspace/utils here (unlike Select.test.tsx): this
// suite exists to prove the *real* random helper never runs during render.
import { MailLabelColorSelect } from "../../Select/MailLabelColorSelect";

const markup = () =>
  renderToStaticMarkup(
    <MantineProvider>
      <MailLabelColorSelect />
    </MantineProvider>,
  );

describe("MailLabelColorSelect server rendering", () => {
  it("renders identical markup every time", () => {
    // Regression: the random seed used to be picked in the useState
    // initialiser, so the server and the client disagreed and hydration broke.
    const renders = Array.from({ length: 8 }, markup);
    expect(new Set(renders).size).toBe(1);
  });

  it("seeds the deterministic default colour on the server", () => {
    expect(markup()).toContain('value="#0000fe"');
  });
});
