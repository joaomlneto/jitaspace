import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type * as OpenInformationWindowActionIconModule from "../../ActionIcon/OpenInformationWindowActionIcon";
import type * as OpenMarketWindowActionIconModule from "../../ActionIcon/OpenMarketWindowActionIcon";
import type * as SetAutopilotDestinationActionIconModule from "../../ActionIcon/SetAutopilotDestinationActionIcon";

// MarketIcon pulls in the (heavy) eve-icons sprite machinery — stub it out.
jest.mock("@jitaspace/eve-icons", () => ({
  MarketIcon: (props: Record<string, unknown>) => (
    <svg data-testid="market-icon" {...props} />
  ),
}));

const { OpenInformationWindowActionIcon } =
  require("../../ActionIcon/OpenInformationWindowActionIcon") as typeof OpenInformationWindowActionIconModule;
const { OpenMarketWindowActionIcon } =
  require("../../ActionIcon/OpenMarketWindowActionIcon") as typeof OpenMarketWindowActionIconModule;
const { SetAutopilotDestinationActionIcon } =
  require("../../ActionIcon/SetAutopilotDestinationActionIcon") as typeof SetAutopilotDestinationActionIconModule;

const renderWithMantine = (ui: React.ReactElement) =>
  render(<MantineProvider>{ui}</MantineProvider>);

const getButton = () => screen.getByRole("button");

const icons: [
  string,
  (props: { disabled?: boolean }) => React.ReactElement,
  string,
][] = [
  [
    "OpenInformationWindowActionIcon",
    (p) => <OpenInformationWindowActionIcon onOpen={jest.fn()} {...p} />,
    "Open information window in the EVE client.",
  ],
  [
    "OpenMarketWindowActionIcon",
    (p) => <OpenMarketWindowActionIcon onOpen={jest.fn()} {...p} />,
    "Open market window in the EVE client.",
  ],
  [
    "SetAutopilotDestinationActionIcon",
    (p) => <SetAutopilotDestinationActionIcon onSet={jest.fn()} {...p} />,
    "Set autopilot destination",
  ],
];

// Regression: these are icon-only buttons, so without an aria-label they had no
// accessible name at all — getByRole("button", { name }) could not find them.
// And they were natively `disabled`, which drops the button out of the tab order
// and stops it receiving mouse events (the browser retargets those to an
// ancestor), so the tooltip never opened in exactly the state that most needs
// explaining. Unavailability is now `aria-disabled` + `data-disabled`.
const expectUnavailable = (button: HTMLElement) => {
  expect(button).toHaveAttribute("aria-disabled", "true");
  expect(button).toHaveAttribute("data-disabled", "true");
};
describe("ActionIcon accessibility", () => {
  it.each(icons)("%s exposes an accessible name", (_label, build, name) => {
    renderWithMantine(build({}));
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it.each(icons)(
    "%s keeps its name while unavailable",
    (_label, build, name) => {
      renderWithMantine(build({ disabled: true }));
      expectUnavailable(screen.getByRole("button", { name }));
    },
  );

  it.each(icons)(
    "%s is announced and described on focus while unavailable",
    async (_label, build, name) => {
      renderWithMantine(build({ disabled: true }));
      // The whole point of not using the native attribute: the button keeps
      // its place in the tab order, so it announces its own name and dimmed
      // state alongside the tooltip rather than leaving a bare description.
      await userEvent.tab();
      const button = screen.getByRole("button", { name });
      expect(document.activeElement).toBe(button);
      expectUnavailable(button);
      // Mantine's Tooltip defaults to `focus: false`; opting in is what makes
      // the description appear for anyone not using a mouse.
      expect(button).toHaveAttribute("aria-describedby");
      expect(screen.getByText(name)).toBeInTheDocument();
    },
  );

  it("marks nothing disabled while the button is usable", () => {
    renderWithMantine(<SetAutopilotDestinationActionIcon onSet={jest.fn()} />);
    const button = screen.getByRole("button");
    // `false` would render as the string "false" and read as disabled.
    expect(button).not.toHaveAttribute("aria-disabled");
    expect(button).not.toHaveAttribute("data-disabled");
  });

  it("does not run the handler while unavailable", async () => {
    const onSet = jest.fn();
    renderWithMantine(
      <SetAutopilotDestinationActionIcon onSet={onSet} disabled />,
    );
    const button = screen.getByRole("button");
    await userEvent.click(button);
    await userEvent.type(button, "{Enter}");
    expect(onSet).not.toHaveBeenCalled();
  });

  it("lets callers set ActionIcon props", () => {
    renderWithMantine(
      <SetAutopilotDestinationActionIcon
        onSet={jest.fn()}
        size="xl"
        data-testid="autopilot"
      />,
    );
    const button = screen.getByTestId("autopilot");
    // `size` has to reach the ActionIcon itself, not just be accepted by the
    // prop type — Mantine renders it as `data-size` plus an `--ai-size` var.
    expect(button).toHaveAttribute("data-size", "xl");
    expect(button.getAttribute("style")).toContain("--ai-size");
  });

  it("lets callers override a default that the wrapper sets", () => {
    renderWithMantine(
      <SetAutopilotDestinationActionIcon
        onSet={jest.fn()}
        radius="xs"
        data-testid="autopilot"
      />,
    );
    // The shared wrapper passes radius="xl" before spreading caller props.
    expect(screen.getByTestId("autopilot").getAttribute("style")).toContain(
      "--ai-radius: var(--mantine-radius-xs)",
    );
  });
});

describe("OpenInformationWindowActionIcon", () => {
  it("renders an enabled button when an onOpen handler is supplied", () => {
    renderWithMantine(<OpenInformationWindowActionIcon onOpen={jest.fn()} />);
    expect(getButton()).toBeEnabled();
  });

  it("invokes onOpen when clicked", async () => {
    const onOpen = jest.fn();
    renderWithMantine(<OpenInformationWindowActionIcon onOpen={onOpen} />);
    await userEvent.click(getButton());
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("is unavailable when no onOpen handler is provided", () => {
    renderWithMantine(<OpenInformationWindowActionIcon />);
    expectUnavailable(getButton());
  });

  it("is unavailable when the disabled prop is set, even with a handler", () => {
    renderWithMantine(
      <OpenInformationWindowActionIcon onOpen={jest.fn()} disabled />,
    );
    expectUnavailable(getButton());
  });
});

describe("OpenMarketWindowActionIcon", () => {
  it("renders the market icon and an enabled button with a handler", () => {
    renderWithMantine(<OpenMarketWindowActionIcon onOpen={jest.fn()} />);
    expect(screen.getByTestId("market-icon")).toBeInTheDocument();
    expect(getButton()).toBeEnabled();
  });

  it("invokes onOpen when clicked", async () => {
    const onOpen = jest.fn();
    renderWithMantine(<OpenMarketWindowActionIcon onOpen={onOpen} />);
    await userEvent.click(getButton());
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("is unavailable when no handler is provided", () => {
    renderWithMantine(<OpenMarketWindowActionIcon />);
    expectUnavailable(getButton());
  });

  it("is unavailable when the disabled prop is set", () => {
    renderWithMantine(
      <OpenMarketWindowActionIcon onOpen={jest.fn()} disabled />,
    );
    expectUnavailable(getButton());
  });

  it("keeps its light variant unless the caller asks otherwise", () => {
    renderWithMantine(
      <OpenMarketWindowActionIcon onOpen={jest.fn()} data-testid="market" />,
    );
    expect(screen.getByTestId("market")).toHaveAttribute(
      "data-variant",
      "light",
    );
  });
});

describe("SetAutopilotDestinationActionIcon", () => {
  it("renders an enabled button when an onSet handler is supplied", () => {
    renderWithMantine(<SetAutopilotDestinationActionIcon onSet={jest.fn()} />);
    expect(getButton()).toBeEnabled();
  });

  it("invokes onSet when clicked", async () => {
    const onSet = jest.fn();
    renderWithMantine(<SetAutopilotDestinationActionIcon onSet={onSet} />);
    await userEvent.click(getButton());
    expect(onSet).toHaveBeenCalledTimes(1);
  });

  it("is unavailable when no onSet handler is provided", () => {
    renderWithMantine(<SetAutopilotDestinationActionIcon />);
    expectUnavailable(getButton());
  });

  it("is unavailable when the disabled prop is set, even with a handler", () => {
    renderWithMantine(
      <SetAutopilotDestinationActionIcon onSet={jest.fn()} disabled />,
    );
    expectUnavailable(getButton());
  });
});
