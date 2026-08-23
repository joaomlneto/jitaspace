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

// Regression: these are icon-only buttons, so without an aria-label they had no
// accessible name at all — getByRole("button", { name }) could not find them.
// And a disabled ActionIcon gets pointer-events: none, so a tooltip attached to
// the button never opened in exactly the state that most needs explaining.
describe("ActionIcon accessibility", () => {
  it.each<
    [string, (props: { disabled?: boolean }) => React.ReactElement, string]
  >([
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
  ])("%s exposes an accessible name", (_label, build, name) => {
    renderWithMantine(build({}));
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });

  it.each<
    [string, (props: { disabled?: boolean }) => React.ReactElement, string]
  >([
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
  ])("%s keeps its name while disabled", (_label, build, name) => {
    renderWithMantine(build({ disabled: true }));
    const button = screen.getByRole("button", { name });
    expect(button).toBeDisabled();
  });

  it("wraps the button so a tooltip still has a live target when disabled", () => {
    // The button itself has pointer-events: none while disabled; the wrapper
    // does not, which is what keeps the tooltip reachable.
    renderWithMantine(<SetAutopilotDestinationActionIcon disabled />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.parentElement?.tagName).toBe("SPAN");
  });

  it("lets callers set ActionIcon props", () => {
    renderWithMantine(
      <SetAutopilotDestinationActionIcon
        onSet={jest.fn()}
        size="xl"
        data-testid="autopilot"
      />,
    );
    expect(screen.getByTestId("autopilot")).toBeInTheDocument();
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
