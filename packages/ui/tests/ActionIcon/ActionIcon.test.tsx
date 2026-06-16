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
