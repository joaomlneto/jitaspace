import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { ImgHTMLAttributes, ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

const mockRouterPush = jest.fn<(url: string) => Promise<boolean>>();
const mockUseEsiSearch =
  jest.fn<() => { data?: { data: Record<string, number[]> } }>();
const mockUseEsiNameLookup = jest.fn<
  () => Record<
    string,
    | {
        status: string;
        value?: { name: string; category: string };
        error: undefined;
        id: number;
      }
    | undefined
  >
>();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock("@mantine/hooks", () => ({
  useDebouncedValue: (value: string) => [value],
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    <img alt={props.alt} {...props} />
  ),
}));

jest.mock("@jitaspace/hooks", () => ({
  useEsiSearch: (...args: unknown[]) => mockUseEsiSearch(...args),
  useEsiNameLookup: (...args: unknown[]) => mockUseEsiNameLookup(...args),
}));

jest.mock("@jitaspace/ui", () => ({
  EveEntityAvatar: () => null,
}));

jest.mock("~/config/apps", () => ({
  jitaApps: {
    character: {
      name: "Character",
      apps: {
        mail: {
          name: "EveMail",
          description: "Access your correspondence whilst out of the game.",
          url: "/mail",
          Icon: () => null,
        },
        skills: {
          name: "Skills",
          description: "Manage your skills and skill points.",
          url: "/skills",
          Icon: () => null,
        },
      },
    },
    universe: {
      name: "Universe",
      apps: {
        market: {
          name: "Market",
          description: "Browse EVE's regional markets",
          url: "/market",
          Icon: () => null,
        },
      },
    },
  },
}));

jest.mock("@mantine/spotlight", () => ({
  Spotlight: {
    Root: ({
      children,
      query,
      onQueryChange,
    }: {
      children: ReactNode;
      query?: string;
      onQueryChange?: (v: string) => void;
      shortcut?: string[];
    }) => (
      <div>
        <input
          data-testid="spotlight-search"
          value={query ?? ""}
          onChange={(e) => onQueryChange?.(e.target.value)}
        />
        {children}
      </div>
    ),
    Search: () => null,
    ActionsList: ({
      children,
    }: {
      children: ReactNode;
      mah?: string;
      style?: Record<string, string>;
    }) => <div data-testid="spotlight-actions-list">{children}</div>,
    Action: ({
      id,
      label,
      onClick,
    }: {
      id: string;
      label?: string;
      description?: string;
      leftSection?: ReactNode;
      onClick?: () => void;
    }) => (
      <button data-testid={`action-${id}`} onClick={onClick}>
        {label}
      </button>
    ),
    ActionsGroup: ({
      label,
      children,
    }: {
      label: string;
      children: ReactNode;
    }) => (
      <div data-testid={`group-${label}`}>
        <span>{label}</span>
        {children}
      </div>
    ),
    Empty: ({ children }: { children: ReactNode }) => (
      <div data-testid="spotlight-empty">{children}</div>
    ),
  },
}));

function renderSpotlight() {
  const { MainSpotlight } = require("~/components/Spotlight/MainSpotlight");
  return render(
    <MantineProvider>
      <MainSpotlight />
    </MantineProvider>,
  );
}

describe("MainSpotlight", () => {
  beforeEach(() => {
    mockRouterPush.mockReset();
    mockUseEsiSearch.mockReturnValue({ data: undefined });
    mockUseEsiNameLookup.mockReturnValue({});
  });

  describe("app actions", () => {
    it("renders the search input", () => {
      renderSpotlight();
      expect(screen.getByTestId("spotlight-search")).toBeInTheDocument();
    });

    it("shows a group for each app category", () => {
      renderSpotlight();
      expect(screen.getByTestId("group-Character Apps")).toBeInTheDocument();
      expect(screen.getByTestId("group-Universe Apps")).toBeInTheDocument();
    });

    it("renders apps within their category group", () => {
      renderSpotlight();
      expect(
        screen.getByTestId("action-app/Character/EveMail"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("action-app/Universe/Market"),
      ).toBeInTheDocument();
    });

    it("navigates to the app url when an action is clicked", () => {
      renderSpotlight();
      fireEvent.click(screen.getByTestId("action-app/Character/EveMail"));
      expect(mockRouterPush).toHaveBeenCalledWith("/mail");
    });
  });

  describe("filtering", () => {
    it("shows only matching apps when a query is typed", () => {
      renderSpotlight();
      fireEvent.change(screen.getByTestId("spotlight-search"), {
        target: { value: "mail" },
      });
      expect(screen.getByTestId("action-app/Character/EveMail")).toBeInTheDocument();
      expect(
        screen.queryByTestId("action-app/Character/Skills"),
      ).not.toBeInTheDocument();
    });

    it("matches apps by description as well as name", () => {
      renderSpotlight();
      // "correspondence" appears in EveMail's description, not its name
      fireEvent.change(screen.getByTestId("spotlight-search"), {
        target: { value: "correspondence" },
      });
      expect(screen.getByTestId("action-app/Character/EveMail")).toBeInTheDocument();
      expect(
        screen.queryByTestId("action-app/Character/Skills"),
      ).not.toBeInTheDocument();
    });

    it("shows all apps again when the query is cleared", () => {
      renderSpotlight();
      const input = screen.getByTestId("spotlight-search");
      fireEvent.change(input, { target: { value: "mail" } });
      fireEvent.change(input, { target: { value: "" } });
      expect(screen.getByTestId("action-app/Character/EveMail")).toBeInTheDocument();
      expect(screen.getByTestId("action-app/Character/Skills")).toBeInTheDocument();
    });

    it("shows the empty state when no apps or results match", () => {
      renderSpotlight();
      fireEvent.change(screen.getByTestId("spotlight-search"), {
        target: { value: "xyznotamatch" },
      });
      expect(screen.getByTestId("spotlight-empty")).toHaveTextContent(
        "No results found",
      );
    });
  });

  describe("ESI search results", () => {
    it("renders entity results returned by the ESI search", () => {
      mockUseEsiSearch.mockReturnValue({
        data: { data: { character: [12345678] } },
      });
      mockUseEsiNameLookup.mockReturnValue({
        "12345678": {
          status: "success",
          value: { name: "Test Character", category: "character" },
          error: undefined,
          id: 1,
        },
      });
      renderSpotlight();
      expect(screen.getByText("Test Character")).toBeInTheDocument();
    });

    it("navigates to the character page when a character result is clicked", () => {
      mockUseEsiSearch.mockReturnValue({
        data: { data: { character: [12345678] } },
      });
      mockUseEsiNameLookup.mockReturnValue({
        "12345678": {
          status: "success",
          value: { name: "Test Character", category: "character" },
          error: undefined,
          id: 1,
        },
      });
      renderSpotlight();
      fireEvent.click(screen.getByTestId("action-entity/12345678"));
      expect(mockRouterPush).toHaveBeenCalledWith("/character/12345678");
    });

    it("navigates to the corporation page when a corporation result is clicked", () => {
      mockUseEsiSearch.mockReturnValue({
        data: { data: { corporation: [98000001] } },
      });
      mockUseEsiNameLookup.mockReturnValue({
        "98000001": {
          status: "success",
          value: { name: "Test Corp", category: "corporation" },
          error: undefined,
          id: 1,
        },
      });
      renderSpotlight();
      fireEvent.click(screen.getByTestId("action-entity/98000001"));
      expect(mockRouterPush).toHaveBeenCalledWith("/corporation/98000001");
    });

    it("navigates to the alliance page when an alliance result is clicked", () => {
      mockUseEsiSearch.mockReturnValue({
        data: { data: { alliance: [99000001] } },
      });
      mockUseEsiNameLookup.mockReturnValue({
        "99000001": {
          status: "success",
          value: { name: "Test Alliance", category: "alliance" },
          error: undefined,
          id: 1,
        },
      });
      renderSpotlight();
      fireEvent.click(screen.getByTestId("action-entity/99000001"));
      expect(mockRouterPush).toHaveBeenCalledWith("/alliance/99000001");
    });

    it("navigates to the inventory type page when an inventory_type result is clicked", () => {
      mockUseEsiSearch.mockReturnValue({
        data: { data: { inventory_type: [34] } },
      });
      mockUseEsiNameLookup.mockReturnValue({
        "34": {
          status: "success",
          value: { name: "Tritanium", category: "inventory_type" },
          error: undefined,
          id: 1,
        },
      });
      renderSpotlight();
      fireEvent.click(screen.getByTestId("action-entity/34"));
      expect(mockRouterPush).toHaveBeenCalledWith("/type/34");
    });

    it("groups entity results by their category", () => {
      mockUseEsiSearch.mockReturnValue({
        data: { data: { character: [12345678], corporation: [98000001] } },
      });
      mockUseEsiNameLookup.mockReturnValue({
        "12345678": {
          status: "success",
          value: { name: "Test Character", category: "character" },
          error: undefined,
          id: 1,
        },
        "98000001": {
          status: "success",
          value: { name: "Test Corp", category: "corporation" },
          error: undefined,
          id: 2,
        },
      });
      renderSpotlight();
      expect(screen.getByTestId("group-character")).toBeInTheDocument();
      expect(screen.getByTestId("group-corporation")).toBeInTheDocument();
    });
  });
});
