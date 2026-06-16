import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// apps/web/app/skills/page.client.tsx is a thin "use client" page: it wraps the
// skills UI in a ScopeGuard and, when a character is selected, renders the
// attribute rings, skill-queue timeline and skill-tree nav. Its only hook is
// useSelectedCharacter; the heavy children are mocked.
// ---------------------------------------------------------------------------

const mockUseSelectedCharacter = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => mockUseSelectedCharacter(),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  SkillsIcon: () => <span data-testid="skills-icon" />,
}));

// ScopeGuard passes children straight through so the inner UI renders.
jest.mock("~/components/ScopeGuard", () => ({
  ScopeGuard: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="scope-guard">{children}</div>
  ),
}));

jest.mock("~/components/Skills", () => ({
  CharacterAttributesRingProgress: ({
    characterId,
  }: {
    characterId?: number;
  }) => <div data-testid="attr-rings">{`rings:${characterId}`}</div>,
  SkillQueueTimeline: ({ characterId }: { characterId?: number }) => (
    <div data-testid="skill-queue">{`queue:${characterId}`}</div>
  ),
  SkillTreeNav: ({
    characterId,
    groups,
  }: {
    characterId?: number;
    groups?: unknown[];
  }) => (
    <div data-testid="skill-tree">
      {`tree:${characterId} groups:${groups?.length ?? 0}`}
    </div>
  ),
}));

const GROUPS = [
  {
    groupId: 255,
    name: "Gunnery",
    published: true,
    types: [
      {
        typeId: 3300,
        name: "Gunnery",
        description: "Basic gunnery skill.",
        iconId: 1,
        graphicId: null,
        published: true,
        attributes: [{ attributeId: 180, value: 1 }],
      },
    ],
  },
];

function renderPage(props: Record<string, unknown> = {}) {
  const Page = require("~/app/skills/page.client").default;
  return render(
    <MantineProvider>
      <Page groups={GROUPS} {...props} />
    </MantineProvider>,
  );
}

describe("Skills page (client)", () => {
  beforeEach(() => {
    mockUseSelectedCharacter.mockReset();
  });

  it("renders the rings, queue and tree when a character is selected", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 90000001 });

    renderPage();

    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByTestId("skills-icon")).toBeInTheDocument();
    expect(screen.getByTestId("scope-guard")).toBeInTheDocument();

    expect(screen.getByText("rings:90000001")).toBeInTheDocument();
    expect(screen.getByText("queue:90000001")).toBeInTheDocument();
    expect(screen.getByText("tree:90000001 groups:1")).toBeInTheDocument();
  });

  it("omits the character-scoped widgets when no character is selected", () => {
    mockUseSelectedCharacter.mockReturnValue(undefined);

    renderPage();

    // Header still renders inside the guard.
    expect(screen.getByText("Skills")).toBeInTheDocument();
    expect(screen.getByTestId("scope-guard")).toBeInTheDocument();

    // No character -> none of the per-character widgets render.
    expect(screen.queryByTestId("attr-rings")).not.toBeInTheDocument();
    expect(screen.queryByTestId("skill-queue")).not.toBeInTheDocument();
    expect(screen.queryByTestId("skill-tree")).not.toBeInTheDocument();
  });
});
