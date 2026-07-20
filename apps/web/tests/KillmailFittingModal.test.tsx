import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// KillmailFittingModal is a thin @mantine/modals context-modal wrapper that
// forwards innerProps.killmailId / innerProps.killmailHash to the heavy
// <EsiKillmailFittingCard>. Stub that child with a tiny inspector so we can
// assert the props are threaded through without pulling in the real fitting
// card (which fetches killmail + type data over ESI).
// jest.mock is NOT auto-hoisted here, so the component is lazy-require()d
// inside the test AFTER the mock is registered.
// ---------------------------------------------------------------------------

jest.mock("~/components/Fitting", () => ({
  EsiKillmailFittingCard: ({
    killmailId,
    killmailHash,
  }: {
    killmailId?: number;
    killmailHash?: string;
  }) => (
    <div data-testid="killmail-fitting-card">
      {`km-${killmailId}-${killmailHash}`}
    </div>
  ),
}));

describe("KillmailFittingModal", () => {
  it("forwards the killmail id and hash from innerProps to the fitting card", () => {
    const {
      KillmailFittingModal,
    } = require("~/components/Modals/KillmailFittingModal");
    render(
      <MantineProvider>
        <KillmailFittingModal
          context={{ closeModal: jest.fn() } as never}
          id="killmail-fitting"
          innerProps={{ killmailId: 12345, killmailHash: "deadbeef" }}
        />
      </MantineProvider>,
    );

    expect(screen.getByTestId("killmail-fitting-card")).toHaveTextContent(
      "km-12345-deadbeef",
    );
  });
});
