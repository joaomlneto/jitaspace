import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// The EveMail editor LinkControls are Mantine RichTextEditor controls that
// insert `showinfo:` links for EVE entities. Each depends on the editor
// context, the EsiSearchSelect UI component and an entity avatar/icon. Mock
// those so the controls can be rendered and exercised in isolation.
// ---------------------------------------------------------------------------

const mockChain = {
  focus: () => mockChain,
  extendMarkRange: () => mockChain,
  setLink: jest.fn((..._args: unknown[]) => mockChain),
  unsetLink: jest.fn((..._args: unknown[]) => mockChain),
  run: jest.fn(),
};

const mockEditor = {
  isActive: jest.fn((..._args: unknown[]) => false),
  getAttributes: jest.fn((..._args: unknown[]) => ({ href: "" })),
  chain: jest.fn((..._args: unknown[]) => mockChain),
};

jest.mock("@mantine/tiptap", () => ({
  useRichTextEditorContext: () => ({ editor: mockEditor, unstyled: false }),
}));

jest.mock("@jitaspace/eve-components", () => ({
  TypeAvatar: () => <span>avatar</span>,
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

const icon = () => <span>icon</span>;
jest.mock("@jitaspace/eve-icons", () => ({
  ChannelOperatorIcon: icon,
  AlliancesIcon: icon,
  CorporationIcon: icon,
  Systems2Icon: icon,
  MapIcon: icon,
  SystemsIcon: icon,
  ItemsIcon: icon,
  FactionalWarfareIcon: icon,
}));

const avatar = () => <span>avatar</span>;
jest.mock("@jitaspace/ui", () => ({
  CharacterAvatar: avatar,
  AllianceAvatar: avatar,
  CorporationAvatar: avatar,
  FactionAvatar: avatar,
}));

const withProvider = (node: React.ReactNode) =>
  render(<MantineProvider>{node}</MantineProvider>);

interface ControlCase {
  name: string;
  label: string;
  placeholder: string;
  sampleId: string;
  expectedHref: string;
}

const CONTROLS: ControlCase[] = [
  {
    name: "CharacterLinkControl",
    label: "Link Character",
    placeholder: "Search Character",
    sampleId: "1373001",
    expectedHref: "showinfo:1373//1373001",
  },
  {
    name: "AllianceLinkControl",
    label: "Link Alliance",
    placeholder: "Search Alliance",
    sampleId: "99000001",
    expectedHref: "showinfo:16159//99000001",
  },
  {
    name: "CorporationLinkControl",
    label: "Link Corporation",
    placeholder: "Search Corporation",
    sampleId: "98000001",
    expectedHref: "showinfo:2//98000001",
  },
  {
    name: "FactionLinkControl",
    label: "Link Faction",
    placeholder: "Search Faction",
    sampleId: "500003",
    expectedHref: "showinfo:30//500003",
  },
  {
    name: "ConstellationLinkControl",
    label: "Link Constellation",
    placeholder: "Search Constellation",
    sampleId: "20000001",
    expectedHref: "showinfo:4//20000001",
  },
  {
    name: "RegionLinkControl",
    label: "Link Region",
    placeholder: "Search Region",
    sampleId: "10000001",
    expectedHref: "showinfo:3//10000001",
  },
  {
    name: "SolarSystemLinkControl",
    label: "Link Solar System",
    placeholder: "Search SolarSystem",
    sampleId: "30000142",
    expectedHref: "showinfo:5//30000142",
  },
  {
    name: "ItemTypeLinkControl",
    label: "Link ItemType",
    placeholder: "Search Item Type",
    sampleId: "587",
    expectedHref: "showinfo:587",
  },
];

const load = (name: string) =>
  require(`~/components/EveMail/Editor/${name}`)[name] as React.ComponentType;

describe("EveMail editor LinkControls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEditor.isActive.mockReturnValue(false);
    mockEditor.getAttributes.mockReturnValue({ href: "" });
  });

  it.each(CONTROLS)(
    "$name renders its labelled control button",
    ({ name, label }) => {
      const Control = load(name);
      withProvider(<Control />);
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    },
  );

  it.each(CONTROLS)(
    "$name opens a search popover when clicked",
    async ({ name, label, placeholder }) => {
      const user = userEvent.setup();
      const Control = load(name);
      withProvider(<Control />);

      await user.click(screen.getByRole("button", { name: label }));

      expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
      expect(screen.getByText("Save")).toBeInTheDocument();
    },
  );

  it.each(CONTROLS)(
    "$name sets a showinfo link when an id is entered and saved",
    async ({ name, label, placeholder, sampleId, expectedHref }) => {
      const user = userEvent.setup();
      const Control = load(name);
      withProvider(<Control />);

      await user.click(screen.getByRole("button", { name: label }));
      await user.type(screen.getByPlaceholderText(placeholder), sampleId);
      await user.click(screen.getByText("Save"));

      expect(mockChain.setLink).toHaveBeenCalledWith({ href: expectedHref });
      expect(mockChain.run).toHaveBeenCalled();
    },
  );

  it.each(CONTROLS)(
    "$name unsets the link when saved with an empty id",
    async ({ name, label }) => {
      const user = userEvent.setup();
      const Control = load(name);
      withProvider(<Control />);

      await user.click(screen.getByRole("button", { name: label }));
      await user.click(screen.getByText("Save"));

      expect(mockChain.unsetLink).toHaveBeenCalled();
      expect(mockChain.setLink).not.toHaveBeenCalled();
    },
  );

  it.each(CONTROLS)(
    "$name applies the link when Enter is pressed in the input",
    async ({ name, label, placeholder, sampleId, expectedHref }) => {
      const user = userEvent.setup();
      const Control = load(name);
      withProvider(<Control />);

      await user.click(screen.getByRole("button", { name: label }));
      await user.type(
        screen.getByPlaceholderText(placeholder),
        `${sampleId}{Enter}`,
      );

      expect(mockChain.setLink).toHaveBeenCalledWith({ href: expectedHref });
    },
  );

  it.each(CONTROLS)(
    "$name shows the linked id, not the raw href, when reopened on its link",
    async ({ name, label, placeholder, sampleId, expectedHref }) => {
      mockEditor.getAttributes.mockReturnValue({ href: expectedHref });
      const user = userEvent.setup();
      const Control = load(name);
      withProvider(<Control />);

      await user.click(screen.getByRole("button", { name: label }));

      expect(screen.getByPlaceholderText(placeholder)).toHaveValue(sampleId);
    },
  );

  it.each(
    CONTROLS.flatMap((control) =>
      ["https://www.jita.space", "killReport:123"].map((href) => ({
        ...control,
        href,
      })),
    ),
  )(
    "$name starts empty when reopened on a $href link",
    async ({ name, label, placeholder, href }) => {
      mockEditor.getAttributes.mockReturnValue({ href });
      const user = userEvent.setup();
      const Control = load(name);
      withProvider(<Control />);

      await user.click(screen.getByRole("button", { name: label }));

      expect(screen.getByPlaceholderText(placeholder)).toHaveValue("");
    },
  );

  // Mantine's Mod-K shortcut fires a window-wide "edit-link" event. Every
  // control used to listen for it, so one keystroke would open all of them at
  // once; only Mantine's own generic Link control should react.
  it.each(CONTROLS)(
    "$name ignores the window-wide edit-link event",
    async ({ name, label }) => {
      const user = userEvent.setup();
      const Control = load(name);
      withProvider(<Control />);
      const button = screen.getByRole("button", { name: label });

      // The dropdown mounts after a transition, so assert on the trigger's
      // aria-expanded, which Mantine sets as soon as the popover opens.
      act(() => {
        window.dispatchEvent(new Event("edit-link"));
      });
      expect(button).toHaveAttribute("aria-expanded", "false");

      await user.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");
    },
  );

  // Mantine's controlled Popover only reports a dismissal; `onClose` waits for
  // `opened` to turn false, so a control listening there never closed.
  it.each(
    CONTROLS.flatMap((control) => [
      { ...control, how: "clicking outside" },
      { ...control, how: "pressing Escape" },
    ]),
  )("$name closes by $how", async ({ name, label, placeholder, how }) => {
    const user = userEvent.setup();
    const Control = load(name);
    withProvider(<Control />);
    const button = screen.getByRole("button", { name: label });

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");

    if (how === "clicking outside") {
      await user.click(document.body);
    } else {
      await user.click(screen.getByPlaceholderText(placeholder));
      await user.keyboard("{Escape}");
    }

    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
