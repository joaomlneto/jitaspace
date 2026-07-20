import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// ViewMailMessageModal is a thin context-modal wrapper that spreads its
// innerProps straight onto <MessagePanel>. Stub MessagePanel (exported from the
// EveMail barrel) with an inspector that serialises the props it receives, so
// we can assert the innerProps are forwarded verbatim without rendering the
// real panel (which fetches mail/labels/mailing-lists over ESI).
// (jest.mock is not auto-hoisted; lazy-require the modal inside the test.)
// ---------------------------------------------------------------------------

jest.mock("~/components/EveMail", () => ({
  MessagePanel: ({
    characterId,
    messageId,
    hideSubject,
  }: {
    characterId?: number;
    messageId?: number;
    hideSubject?: boolean;
  }) => (
    <div data-testid="message-panel">
      {`char-${characterId}-msg-${messageId}-hideSubject-${String(
        !!hideSubject,
      )}`}
    </div>
  ),
}));

describe("ViewMailMessageModal", () => {
  it("forwards innerProps verbatim to the message panel", () => {
    const {
      ViewMailMessageModal,
    } = require("~/components/Modals/ViewMailMessageModal");
    render(
      <MantineProvider>
        <ViewMailMessageModal
          context={{ closeModal: jest.fn() } as never}
          id="view-mail"
          innerProps={{
            characterId: 42,
            data: [],
            messageId: 999,
            hideSubject: true,
          }}
        />
      </MantineProvider>,
    );

    expect(screen.getByTestId("message-panel")).toHaveTextContent(
      "char-42-msg-999-hideSubject-true",
    );
  });
});
