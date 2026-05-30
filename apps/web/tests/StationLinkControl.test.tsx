import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks — StationLinkControl is a Mantine RichTextEditor control that depends
// on the editor context, ESI lookups and the EsiSearchSelect UI component.
// ---------------------------------------------------------------------------

const mockChainRun = jest.fn();
const mockSetLinkChain = {
  focus: () => mockSetLinkChain,
  extendMarkRange: () => mockSetLinkChain,
  setLink: jest.fn(() => mockSetLinkChain),
  unsetLink: jest.fn(() => mockSetLinkChain),
  run: mockChainRun,
};

const mockEditor = {
  isActive: jest.fn(() => false),
  getAttributes: jest.fn(() => ({ href: "" })),
  chain: jest.fn(() => mockSetLinkChain),
};

jest.mock("@mantine/tiptap", () => ({
  useRichTextEditorContext: () => ({ editor: mockEditor, unstyled: false }),
}));

const mockGetUniverseStation = jest.fn(() =>
  Promise.resolve({ data: { type_id: 52678 } }),
);

jest.mock("@jitaspace/esi-client", () => ({
  getUniverseStationsStationId: (...args: unknown[]) =>
    mockGetUniverseStation(...args),
}));

jest.mock("@jitaspace/eve-icons", () => ({
  StationIcon: () => <span>StationIcon</span>,
}));

jest.mock("@jitaspace/ui", () => ({
  EsiSearchSelect: (props: {
    placeholder?: string;
    value?: string;
    onChange?: (v: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  }) => (
    <input
      placeholder={props.placeholder}
      value={props.value}
      onChange={(e) => props.onChange?.(e.target.value)}
      onKeyDown={props.onKeyDown}
    />
  ),
}));

jest.mock("~/components/Avatar", () => ({
  StationAvatar: () => <span>StationAvatar</span>,
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
    // wait for the promise chain inside setLink to resolve
    await Promise.resolve();
    await Promise.resolve();
    expect(mockSetLinkChain.setLink).toHaveBeenCalledWith({
      href: "showinfo:52678//60003760",
    });
    expect(mockChainRun).toHaveBeenCalled();
  });

  it("unsets the link when Save is clicked with an empty station id", async () => {
    const user = userEvent.setup();
    const {
      StationLinkControl,
    } = require("~/components/EveMail/Editor/StationLinkControl");
    withProvider(<StationLinkControl />);

    await user.click(screen.getByRole("button", { name: "Link Station" }));
    await user.click(screen.getByText("Save"));

    expect(mockGetUniverseStation).toHaveBeenCalledWith(NaN);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockSetLinkChain.unsetLink).toHaveBeenCalled();
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
