import "@testing-library/jest-dom/jest-globals";

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

let structureId = "1234567890123";

const mockUseStructure = jest.fn();
const mockUseSelectedCharacter = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ structureId }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useStructure: (id: number) => mockUseStructure(id),
  useSelectedCharacter: () => mockUseSelectedCharacter(),
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("~/components/ActionIcon", () => ({
  SetAutopilotDestinationActionIcon: () => null,
}));

jest.mock("~/components/Avatar", () => ({
  StructureAvatar: () => <div>Structure Avatar</div>,
}));

jest.mock("~/components/Badge", () => ({
  SolarSystemSecurityStatusBadge: () => <div>Security Badge</div>,
}));

jest.mock("~/components/ScopeGuard", () => ({
  ScopeGuard: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href?: string | object; children?: ReactNode }) => (
    <a href={typeof href === "string" ? href : ""}>{children}</a>
  ),
}));

function renderPage() {
  const Page = require("~/app/structure/[structureId]/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("structure page", () => {
  afterEach(() => {
    jest.clearAllMocks();
    structureId = "1234567890123";
  });

  it("renders all sections with rich structure data and a selected character", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 12345 });
    mockUseStructure.mockReturnValue({
      data: {
        data: {
          solar_system_id: 30000142,
          type_id: 35832,
          owner_id: 98000001,
        },
      },
    });

    renderPage();

    expect(screen.getByText("Solar System")).toBeInTheDocument();
    expect(screen.getByText("Structure Type")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    // system + type links built from structure data
    const links = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(links).toContain("/system/30000142");
    expect(links).toContain("/type/35832");
  });

  it("renders with undefined structure data and no selected character", () => {
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseStructure.mockReturnValue({ data: undefined });

    renderPage();

    expect(screen.getByText("Solar System")).toBeInTheDocument();
    expect(screen.getByText("Structure Type")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("returns null when the structure id is not finite", () => {
    structureId = "not-finite";
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseStructure.mockReturnValue({ data: undefined });

    renderPage();
    // page returns null -> none of its content is rendered
    expect(screen.queryByText("Solar System")).not.toBeInTheDocument();
    expect(screen.queryByText("Structure Type")).not.toBeInTheDocument();
  });
});
