import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks — StationLinkControl is a Mantine RichTextEditor control that depends
// on the editor context, ESI lookups and the EsiSearchSelect UI component.
// ---------------------------------------------------------------------------

const mockChainRun = jest.fn<(...args: unknown[]) => unknown>();
const mockSetLinkChain = {
  focus: () => mockSetLinkChain,
  extendMarkRange: () => mockSetLinkChain,
  setLink: jest.fn((..._args: unknown[]) => mockSetLinkChain),
  unsetLink: jest.fn((..._args: unknown[]) => mockSetLinkChain),
  run: mockChainRun,
};

const mockEditor = {
  isActive: jest.fn((..._args: unknown[]) => false),
  getAttributes: jest.fn((..._args: unknown[]) => ({ href: "" })),
  chain: jest.fn((..._args: unknown[]) => mockSetLinkChain),
};

jest.mock("@mantine/tiptap", () => ({
  useRichTextEditorContext: () => ({ editor: mockEditor, unstyled: false }),
}));

const mockGetUniverseStation = jest.fn((..._args: unknown[]) =>
  Promise.resolve({ data: { type_id: 52678 } }),
);

const mockGetUniverseStructure = jest.fn(
  (..._args: unknown[]): Promise<{ data: { type_id?: number } }> =>
    Promise.resolve({ data: { type_id: 35832 } }),
);

jest.mock("@jitaspace/esi-client", () => ({
  getUniverseStationsStationId: (...args: unknown[]) =>
    mockGetUniverseStation(...args),
  getUniverseStructuresStructureId: (...args: unknown[]) =>
    mockGetUniverseStructure(...args),
}));

jest.mock("@jitaspace/hooks", () => ({
  useAccessToken: () => ({
    authHeaders: { Authorization: "Bearer test-token" },
  }),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  StationIcon: () => <span>StationIcon</span>,
}));

jest.mock("@jitaspace/eve-components", () => ({
  EsiSearchSelect: (props: {
    placeholder?: string;
    value?: string;
    onChange?: (v: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    error?: string | null;
    leftSection?: React.ReactNode;
  }) => (
    <>
      {props.leftSection}
      <input
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange?.(e.target.value)}
        onKeyDown={props.onKeyDown}
      />
      {props.error && <span>{props.error}</span>}
    </>
  ),
}));

jest.mock("~/components/Avatar", () => ({
  StationAvatar: () => <span>StationAvatar</span>,
  StructureAvatar: () => <span>StructureAvatar</span>,
}));

function withProvider(node: React.ReactNode) {
  return render(<MantineProvider>{node}</MantineProvider>);
}

describe("StationLinkControl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEditor.isActive.mockReturnValue(false);
    mockEditor.getAttributes.mockReturnValue({ href: "" });
  });

  it("renders the control button with the Link Station label", () => {
    const {
      StationLinkControl,
    } = require("~/components/EveMail/Editor/StationLinkControl");
    withProvider(<StationLinkControl />);
    expect(
      screen.getByRole("button", { name: "Link Station" }),
    ).toBeInTheDocument();
  });

  it("opens the station search popover when the control is clicked", async () => {
    const user = userEvent.setup();
    const {
      StationLinkControl,
    } = require("~/components/EveMail/Editor/StationLinkControl");
    withProvider(<StationLinkControl />);

    await user.click(screen.getByRole("button", { name: "Link Station" }));

    expect(screen.getByPlaceholderText("Search Station")).toBeInTheDocument();
    // Popover dropdown content is rendered (the Save button text is present).
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it.each([
    ["station", "showinfo:52678//60003760", "60003760"],
    ["structure", "showinfo:35832//1035466617946", "1035466617946"],
    ["character", "showinfo:1373//93345033", ""],
  ])(
    "prefills the search with the linked id when reopened on a %s link",
    async (_kind, href, expected) => {
      mockEditor.getAttributes.mockReturnValue({ href });
      const user = userEvent.setup();
      const {
        StationLinkControl,
      } = require("~/components/EveMail/Editor/StationLinkControl");
      withProvider(<StationLinkControl />);

      await user.click(screen.getByRole("button", { name: "Link Station" }));

      expect(screen.getByPlaceholderText("Search Station")).toHaveValue(
        expected,
      );
    },
  );

  it("looks up the station and sets a showinfo link when Save is clicked", async () => {
    const user = userEvent.setup();
    const {
      StationLinkControl,
    } = require("~/components/EveMail/Editor/StationLinkControl");
    withProvider(<StationLinkControl />);

    await user.click(screen.getByRole("button", { name: "Link Station" }));
    const input = screen.getByPlaceholderText("Search Station");
    await user.type(input, "60003760");
    await user.click(screen.getByText("Save"));

    expect(mockGetUniverseStation).toHaveBeenCalledWith(60003760);
    await waitFor(() =>
      expect(mockSetLinkChain.setLink).toHaveBeenCalledWith({
        href: "showinfo:52678//60003760",
      }),
    );
    expect(mockChainRun).toHaveBeenCalled();
    expect(mockGetUniverseStructure).not.toHaveBeenCalled();
  });

  it("looks up a structure with the character's token and links it with its own type", async () => {
    const user = userEvent.setup();
    const {
      StationLinkControl,
    } = require("~/components/EveMail/Editor/StationLinkControl");
    withProvider(<StationLinkControl />);

    await user.click(screen.getByRole("button", { name: "Link Station" }));
    await user.type(
      screen.getByPlaceholderText("Search Station"),
      "1035466617946",
    );
    await user.click(screen.getByText("Save"));

    expect(mockGetUniverseStructure).toHaveBeenCalledWith(1035466617946, {
      Authorization: "Bearer test-token",
    });
    expect(mockGetUniverseStation).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mockSetLinkChain.setLink).toHaveBeenCalledWith({
        href: "showinfo:35832//1035466617946",
      }),
    );
  });

  it.each([
    [
      "the structure lookup fails",
      "1035466617946",
      () => mockGetUniverseStructure.mockRejectedValueOnce(new Error("403")),
      "Couldn't look up this structure. Log in with a character that can see it.",
    ],
    [
      "ESI returns the structure without a type",
      "1035466617946",
      () => mockGetUniverseStructure.mockResolvedValueOnce({ data: {} }),
      "Couldn't look up this structure. Log in with a character that can see it.",
    ],
    [
      "the station lookup fails",
      "60003760",
      () => mockGetUniverseStation.mockRejectedValueOnce(new Error("503")),
      "Couldn't look up this station. Try again.",
    ],
  ])(
    "keeps the popover open with an error, and writes no link, when %s",
    async (_case, id, arrange, message) => {
      arrange();
      const user = userEvent.setup();
      const {
        StationLinkControl,
      } = require("~/components/EveMail/Editor/StationLinkControl");
      withProvider(<StationLinkControl />);

      await user.click(screen.getByRole("button", { name: "Link Station" }));
      const input = screen.getByPlaceholderText("Search Station");
      await user.type(input, id);
      await user.click(screen.getByText("Save"));

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(mockSetLinkChain.setLink).not.toHaveBeenCalled();
      expect(input).toHaveValue(id);

      // Editing the selection clears the error.
      await user.type(input, "1");
      expect(screen.queryByText(message)).not.toBeInTheDocument();
    },
  );

  it.each([
    ["station", "60003760", "StationAvatar"],
    ["structure", "1035466617946", "StructureAvatar"],
  ])("shows the %s avatar for a %s id", async (_kind, id, avatar) => {
    const user = userEvent.setup();
    const {
      StationLinkControl,
    } = require("~/components/EveMail/Editor/StationLinkControl");
    withProvider(<StationLinkControl />);

    await user.click(screen.getByRole("button", { name: "Link Station" }));
    await user.type(screen.getByPlaceholderText("Search Station"), id);

    expect(screen.getByText(avatar)).toBeInTheDocument();
  });

  it("unsets the link when Save is clicked with an empty station id", async () => {
    const user = userEvent.setup();
    const {
      StationLinkControl,
    } = require("~/components/EveMail/Editor/StationLinkControl");
    withProvider(<StationLinkControl />);

    await user.click(screen.getByRole("button", { name: "Link Station" }));
    await user.click(screen.getByText("Save"));

    // An empty id means "remove the link": nothing to look up. (This used to
    // call ESI with NaN, which fails, so the link was never removed.)
    expect(mockSetLinkChain.unsetLink).toHaveBeenCalled();
    expect(mockGetUniverseStation).not.toHaveBeenCalled();
    expect(mockGetUniverseStructure).not.toHaveBeenCalled();
  });

  it("triggers the link lookup when Enter is pressed in the search input", async () => {
    const user = userEvent.setup();
    const {
      StationLinkControl,
    } = require("~/components/EveMail/Editor/StationLinkControl");
    withProvider(<StationLinkControl />);

    await user.click(screen.getByRole("button", { name: "Link Station" }));
    const input = screen.getByPlaceholderText("Search Station");
    await user.type(input, "60003760{Enter}");

    expect(mockGetUniverseStation).toHaveBeenCalled();
  });
});
