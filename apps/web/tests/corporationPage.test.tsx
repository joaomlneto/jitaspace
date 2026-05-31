import "@testing-library/jest-dom/jest-globals";

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

let corporationId = "98000001";

const mockUseCorporation = jest.fn();
const mockUseSelectedCharacter = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ corporationId }),
  useRouter: () => ({}),
  usePathname: () => "/",
}));

jest.mock("@jitaspace/hooks", () => ({
  useCorporation: (id: number) => mockUseCorporation(id),
  useSelectedCharacter: () => mockUseSelectedCharacter(),
}));

jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));

jest.mock("@jitaspace/tiptap-eve", () => ({
  sanitizeFormattedEveString: (s: string) => s,
}));

jest.mock("~/components/ActionIcon", () => ({
  OpenInformationWindowActionIcon: () => null,
}));

jest.mock("~/components/Timeline", () => ({
  CorporationAllianceHistoryTimeline: () => <div>Alliance History Timeline</div>,
}));

jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content?: string }) => <div>{content}</div>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href?: string | object; children?: ReactNode }) => (
    <a href={typeof href === "string" ? href : ""}>{children}</a>
  ),
}));

function renderPage() {
  const Page = require("~/app/corporation/[corporationId]/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

describe("corporation page", () => {
  afterEach(() => {
    jest.clearAllMocks();
    corporationId = "98000001";
  });

  it("renders all sections with rich corporation data", () => {
    mockUseSelectedCharacter.mockReturnValue({ characterId: 12345 });
    mockUseCorporation.mockReturnValue({
      data: {
        data: {
          ticker: "E-UNI",
          alliance_id: 937872513,
          description: "<b>EVE University</b>",
        },
      },
    });

    renderPage();

    expect(screen.getByText("E-UNI")).toBeInTheDocument();
    expect(screen.getByText("Alliance")).toBeInTheDocument();
    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.getByText("Alliance History")).toBeInTheDocument();
    // description passed through sanitize into MailMessageViewer
    expect(screen.getByText("<b>EVE University</b>")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "DOTLAN EveMaps" }),
    ).toHaveAttribute("href", "https://evemaps.dotlan.net/corp/98000001");
  });

  it("renders 'No description' and hides alliance when fields are missing", () => {
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseCorporation.mockReturnValue({
      data: { data: {} },
    });

    renderPage();

    expect(screen.queryByText("Alliance")).not.toBeInTheDocument();
    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("renders without description block when corporation data is undefined", () => {
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseCorporation.mockReturnValue({ data: undefined });

    renderPage();

    expect(screen.getByText("Description")).toBeInTheDocument();
    expect(screen.queryByText("No description")).not.toBeInTheDocument();
    expect(screen.queryByText("Alliance")).not.toBeInTheDocument();
  });

  it("returns null when the corporation id is not finite", () => {
    corporationId = "nope";
    mockUseSelectedCharacter.mockReturnValue(null);
    mockUseCorporation.mockReturnValue({ data: undefined });

    renderPage();
    // page returns null -> none of its content is rendered
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
    expect(screen.queryByText("Alliance History")).not.toBeInTheDocument();
  });
});
