import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";

import { SkillBar } from "../../SkillLevelBar/SkillBar";

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const levelSquares = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("div")).filter(
    (el) => el.style.width === "8px" && el.style.height === "8px",
  );

// Regression: `missingStrong` was spelled `backGroundColor`. React drops an
// unknown style key, and because those levels *are* required they never reach
// the `notRequired` border branch either — so they rendered with no fill and no
// outline at all. The existing SkillBar suite had full line coverage and still
// missed it, because it never passed this requirementType.
describe("SkillBar requirementType", () => {
  it.each<["queued" | "missing" | "missingStrong", string]>([
    ["queued", "rgb(108, 165, 188)"],
    ["missing", "rgb(62, 72, 70)"],
    ["missingStrong", "rgb(236, 101, 95)"],
  ])("paints required-but-untrained levels for %p", (requirementType, rgb) => {
    const { container } = renderWithMantine(
      <SkillBar activeLevel={1} requiredLevel={5} requirementType={requirementType} />,
    );
    // Level 1 is trained; levels 2-5 are required and untrained.
    const required = levelSquares(container).slice(1);
    expect(required).toHaveLength(4);
    for (const square of required) {
      expect(square.style.backgroundColor).toBe(rgb);
    }
  });

  it("gives every square some visible treatment", () => {
    // Nothing should render as an invisible 8x8 box: each square is either
    // filled or outlined.
    for (const requirementType of ["queued", "missing", "missingStrong"] as const) {
      const { container } = renderWithMantine(
        <SkillBar activeLevel={2} requiredLevel={4} requirementType={requirementType} />,
      );
      for (const square of levelSquares(container)) {
        const visible =
          square.style.backgroundColor !== "" || square.style.border !== "";
        expect(visible).toBe(true);
      }
    }
  });
});
