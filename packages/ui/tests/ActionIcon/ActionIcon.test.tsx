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
// And a disabled button receives no mouse events (the browser retargets them to
// an ancestor), so a tooltip attached to the button never opened in exactly the
// state that most needs explaining.
describe("ActionIcon accessibility", () => {
  it.each(icons)("%s exposes an accessible name", (_label, build, name) => {
    renderWithMantine(build({}));
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it.each(icons)("%s keeps its name while disabled", (_label, build, name) => {
    renderWithMantine(build({ disabled: true }));
    const button = screen.getByRole("button", { name });
    expect(button).toBeDisabled();
  });

  it("wraps the button so a tooltip still has a live target when disabled", () => {
    // The disabled button receives no mouse events of its own; the wrapper
    // does, which is what keeps the tooltip reachable by pointer.
    renderWithMantine(<SetAutopilotDestinationActionIcon disabled />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.parentElement?.tagName).toBe("SPAN");
  });

  it.each(icons)(
    "%s can be reached by keyboard while disabled, and describes itself",
    async (_label, build, name) => {
      renderWithMantine(build({ disabled: true }));
      // A disabled button is not focusable, so tab lands on the wrapper — the
      // only reason a keyboard user can find out why the control is dead.
      await userEvent.tab();
      const wrapper = screen.getByRole("button").parentElement;
      expect(document.activeElement).toBe(wrapper);
      // Mantine's Tooltip defaults to `focus: false`; opting in is what makes
      // the description appear for anyone not using a mouse.
      expect(wrapper).toHaveAttribute("aria-describedby");
      expect(screen.getByText(name)).toBeInTheDocument();
    },
  );

  it("does not add a tab stop when the button is usable", async () => {
    renderWithMantine(<SetAutopilotDestinationActionIcon onSet={jest.fn()} />);
    const button = screen.getByRole("button");
    expect(button.parentElement).not.toHaveAttribute("tabindex");
    await userEvent.tab();
    expect(document.activeElement).toBe(button);
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

  it("is disabled when no onOpen handler is provided", () => {
    renderWithMantine(<OpenInformationWindowActionIcon />);
    expect(getButton()).toBeDisabled();
  });

  it("is disabled when the disabled prop is set, even with a handler", () => {
    renderWithMantine(
      <OpenInformationWindowActionIcon onOpen={jest.fn()} disabled />,
    );
    expect(getButton()).toBeDisabled();
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

  it("is disabled when no handler is provided", () => {
    renderWithMantine(<OpenMarketWindowActionIcon />);
    expect(getButton()).toBeDisabled();
  });

  it("is disabled when the disabled prop is set", () => {
    renderWithMantine(
      <OpenMarketWindowActionIcon onOpen={jest.fn()} disabled />,
    );
    expect(getButton()).toBeDisabled();
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

  it("is disabled when no onSet handler is provided", () => {
    renderWithMantine(<SetAutopilotDestinationActionIcon />);
    expect(getButton()).toBeDisabled();
  });

  it("is disabled when the disabled prop is set, even with a handler", () => {
    renderWithMantine(
      <SetAutopilotDestinationActionIcon onSet={jest.fn()} disabled />,
    );
    expect(getButton()).toBeDisabled();
  });
});
