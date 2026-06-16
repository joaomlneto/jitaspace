import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// ComposeMailModal is a thin context-modal wrapper around <EveMailComposeForm>.
// Its only behaviour is wiring the form's onSend callback to
// context.closeModal(id). Stub the form with an inspector that exposes a button
// invoking the injected onSend, so we can assert the close wiring directly.
// (jest.mock is not auto-hoisted; lazy-require the modal inside each test.)
// ---------------------------------------------------------------------------

jest.mock("~/components/EveMail/EveMailComposeForm", () => ({
  EveMailComposeForm: ({ onSend }: { onSend?: () => void }) => (
    <button type="button" onClick={() => onSend?.()}>
      trigger-send
    </button>
  ),
}));

describe("ComposeMailModal", () => {
  it("renders the compose form", () => {
    const { ComposeMailModal } = require("~/components/Modals/ComposeMailModal");
    render(
      <MantineProvider>
        <ComposeMailModal
          context={{ closeModal: jest.fn() } as never}
          id="compose"
          innerProps={{}}
        />
      </MantineProvider>,
    );
    expect(screen.getByText("trigger-send")).toBeInTheDocument();
  });

  it("closes the modal with its own id when the form reports a send", async () => {
    const user = userEvent.setup();
    const closeModal = jest.fn();
    const { ComposeMailModal } = require("~/components/Modals/ComposeMailModal");
    render(
      <MantineProvider>
        <ComposeMailModal
          context={{ closeModal } as never}
          id="compose-123"
          innerProps={{}}
        />
      </MantineProvider>,
    );

    await user.click(screen.getByText("trigger-send"));
    expect(closeModal).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledWith("compose-123");
  });
});
