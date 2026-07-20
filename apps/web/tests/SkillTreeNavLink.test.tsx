import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

const mockUseCharacterSkills = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useCharacterSkills: (characterId: number) =>
    mockUseCharacterSkills(characterId),
}));

// UI components (SkillBar/TypeAnchor/TypeName) pull in heavy EVE rendering;
// stub them so the NavLink body still renders in jsdom. TypeAnchor must pass
// its children through, since the skill names are rendered inside it.
jest.mock("@jitaspace/ui", () => ({
  SkillBar: () => null,
}));

// TypeAnchor / TypeName moved to @jitaspace/eve-components.
jest.mock("@jitaspace/eve-components", () => ({
  TypeAnchor: ({ children }: { children?: ReactNode }) => (
    <span>{children}</span>
  ),
  TypeName: ({ typeId }: { typeId: number }) => <span>{`Type ${typeId}`}</span>,
}));

const group = {
  groupId: 200,
  name: "Spaceship Command",
  published: true,
  types: [
    {
      typeId: 3300,
      name: "Gunnery",
      description: "desc",
      published: true,
      attributes: [{ attributeId: 275, value: 1 }],
    },
    {
      typeId: 3301,
      name: "Small Hybrid Turret",
      description: "desc",
      published: true,
      attributes: [{ attributeId: 275, value: 2 }],
    },
    {
      typeId: 9999,
      name: "Hidden Skill",
      description: "desc",
      published: false,
      attributes: [{ attributeId: 275, value: 4 }],
    },
  ],
};

function renderComponent(props: Record<string, unknown> = {}) {
  const {
    SkillTreeNavLink,
  } = require("~/components/Skills/SkillTreeNav/SkillTreeNavLink");
  return render(
    <MantineProvider>
      <SkillTreeNavLink characterId={1} group={group} {...props} />
    </MantineProvider>,
  );
}

describe("SkillTreeNavLink", () => {
  beforeEach(() => {
    mockUseCharacterSkills.mockReset();
  });

  it("shows a loader for the character SP while skills are loading", () => {
    mockUseCharacterSkills.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });
    renderComponent();
    // group name is always rendered in the label
    expect(screen.getByText("Spaceship Command")).toBeInTheDocument();
    // published rows render; the unpublished one is filtered out by default
    expect(screen.getByText("Gunnery")).toBeInTheDocument();
    expect(screen.getByText("Small Hybrid Turret")).toBeInTheDocument();
    expect(screen.queryByText("Hidden Skill")).not.toBeInTheDocument();
  });

  it("computes character SP in group from the skills index when data is present", () => {
    mockUseCharacterSkills.mockReturnValue({
      data: {
        data: {
          skills: [
            {
              skill_id: 3300,
              skillpoints_in_skill: 256000,
              active_skill_level: 5,
              trained_skill_level: 5,
            },
            {
              skill_id: 3301,
              skillpoints_in_skill: 12000,
              active_skill_level: 3,
              trained_skill_level: 3,
            },
          ],
        },
      },
      isLoading: false,
      error: undefined,
    });
    const { container } = renderComponent();
    // sum of the two matching skills = 268,000 SP. The value renders in a text
    // node mixed with " / ... SP" siblings, so assert on the combined output.
    expect(container.textContent).toContain("268,000");
    expect(screen.getByText("Spaceship Command")).toBeInTheDocument();
  });

  it("renders unpublished skills when showUnpublished is set", () => {
    mockUseCharacterSkills.mockReturnValue({
      data: { data: { skills: [] } },
      isLoading: false,
      error: undefined,
    });
    renderComponent({ showUnpublished: true });
    expect(screen.getByText("Hidden Skill")).toBeInTheDocument();
  });

  it("fetches skill names from ESI via TypeName when fetchNameFromEsi is set", () => {
    mockUseCharacterSkills.mockReturnValue({
      data: { data: { skills: [] } },
      isLoading: false,
      error: undefined,
    });
    renderComponent({ fetchNameFromEsi: true });
    // the mocked TypeName renders "Type <id>" instead of the static name
    expect(screen.getByText("Type 3300")).toBeInTheDocument();
    expect(screen.getByText("Type 3301")).toBeInTheDocument();
    expect(screen.queryByText("Gunnery")).not.toBeInTheDocument();
  });
});
