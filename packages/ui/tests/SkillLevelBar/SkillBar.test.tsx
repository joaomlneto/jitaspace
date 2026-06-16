import "@testing-library/jest-dom/jest-globals";

import type { ReactElement } from "react";
import { describe, expect, it } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// SkillBar has no external @jitaspace deps — it only reads the colour scheme
// from Mantine and renders five 8x8 level squares inside a Tooltip.
const { SkillBar } = require("../../SkillLevelBar/SkillBar") as typeof import("../../SkillLevelBar/SkillBar");

const renderWithMantine = (ui: ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

// The five level squares are the small fixed-size divs (8x8) inside the Group.
const levelSquares = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>("div")).filter(
    (el) => el.style.width === "8px" && el.style.height === "8px",
  );

describe("SkillBar", () => {
  it("always renders five level squares", () => {
    const { container } = renderWithMantine(<SkillBar />);
    expect(levelSquares(container)).toHaveLength(5);
  });

  it("colours trained levels with the trained background (light scheme)", () => {
    // activeLevel 3 -> levels 1..3 trained, 4..5 required/missing.
    const { container } = renderWithMantine(
      <SkillBar activeLevel={3} requiredLevel={5} />,
    );
    const squares = levelSquares(container);
    // Trained squares (default light scheme -> #464646).
    expect(squares[0]?.style.backgroundColor).toBe("rgb(70, 70, 70)");
    expect(squares[2]?.style.backgroundColor).toBe("rgb(70, 70, 70)");
    // Required-but-untrained square uses the "missing" colour (#3E4846).
    expect(squares[3]?.style.backgroundColor).toBe("rgb(62, 72, 70)");
  });

  it("uses the lighter trained colour under the dark scheme", () => {
    // In dark mode the trained square switches to #CCCCCC.
    const { container } = render(
      <MantineProvider forceColorScheme="dark">
        <SkillBar activeLevel={2} requiredLevel={5} />
      </MantineProvider>,
    );
    const squares = levelSquares(container);
    expect(squares[0]?.style.backgroundColor).toBe("rgb(204, 204, 204)");
    expect(squares[1]?.style.backgroundColor).toBe("rgb(204, 204, 204)");
  });

  it("applies the 'queued' requirement colour for required-untrained levels", () => {
    const { container } = renderWithMantine(
      <SkillBar activeLevel={1} requiredLevel={4} requirementType="queued" />,
    );
    const squares = levelSquares(container);
    // Level 1 trained, levels 2..4 required (queued -> #6CA5BC).
    expect(squares[1]?.style.backgroundColor).toBe("rgb(108, 165, 188)");
    // Level 5 is beyond requiredLevel -> notRequired (a border, no bg colour).
    expect(squares[4]?.style.backgroundColor).toBe("");
    expect(squares[4]?.style.border).toContain("1px solid");
  });

  it("marks levels above the required level as not-required (border only)", () => {
    const { container } = renderWithMantine(
      <SkillBar activeLevel={0} requiredLevel={2} />,
    );
    const squares = levelSquares(container);
    // Levels 3..5 exceed requiredLevel -> notRequired border, no background.
    expect(squares[2]?.style.border).toContain("1px solid");
    expect(squares[4]?.style.border).toContain("1px solid");
  });

  it("treats every level as not-required when requiredLevel is 0", () => {
    const { container } = renderWithMantine(
      <SkillBar activeLevel={0} requiredLevel={0} />,
    );
    const squares = levelSquares(container);
    // requiredLevel falsy -> isRequired() is falsy for all -> all notRequired.
    squares.forEach((sq) => {
      expect(sq.style.border).toContain("1px solid");
    });
  });

  it("shows trained/required levels in the tooltip on hover", async () => {
    const { container } = renderWithMantine(
      <SkillBar activeLevel={4} requiredLevel={5} />,
    );
    const target = container.querySelector(".mantine-Group-root");
    expect(target).not.toBeNull();
    await userEvent.hover(target!);

    // Tooltip content is rendered into the document once hovered.
    const trainedLabels = await import("@testing-library/react").then(
      ({ screen }) => screen.findByText("Level trained:"),
    );
    expect(trainedLabels).toBeInTheDocument();
    const { screen } = await import("@testing-library/react");
    expect(screen.getByText("Level required:")).toBeInTheDocument();
  });
});
