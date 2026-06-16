import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

jest.mock("@jitaspace/hooks", () => ({
  useSelectedCharacter: () => ({ characterId: 123 }),
  useCharacterWalletJournal: () => ({ data: { data: [] } }),
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("@jitaspace/ui", () => new Proxy({}, { get: () => () => null }));
jest.mock(
  "@jitaspace/eve-components",
  () => new Proxy({}, { get: () => () => null }),
);
// Skip the scope gate so we render the wallet content (and the real WalletTable,
// which reserves its height) directly.
jest.mock("~/components/ScopeGuard", () => ({
  ScopeGuard: ({ children }: { children: React.ReactNode }) => children,
}));

const WalletPage = require("~/app/wallet/character/page").default;

describe("Wallet character page", () => {
  it("renders the wallet heading and the (height-reserving) journal table", () => {
    const { container } = render(
      <MantineProvider>
        <WalletPage />
      </MantineProvider>,
    );

    expect(screen.getByRole("heading", { name: "Wallet" })).toBeInTheDocument();
    // The WalletTable renders even with no entries (its column headers show).
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
  });
});
