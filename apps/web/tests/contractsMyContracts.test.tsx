import "@testing-library/jest-dom/jest-globals";

import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";

import type { AuthenticatedContract } from "@jitaspace/hooks";

import type * as MyContractsModule from "~/app/contracts/MyContracts";
import type { ContractFilters } from "~/components/Contracts/filters";

// What "Your contracts" picks out of ESI's listings, and how the page's
// filters and sort apply to it in the browser. The hooks are replaced with
// fixed results; @swc/jest does not hoist jest.mock above imports, so the
// component is required lazily below.

let mockHasHydrated = true;
let mockSelected: { accessTokenPayload: { scp: string[] } } | null = null;
let mockContracts: {
  data: AuthenticatedContract[];
  isPending: boolean;
  errors: unknown[];
  characterIds: number[];
  corporationIds: number[];
};
jest.mock("@jitaspace/hooks", () => ({
  useAuthStoreHasHydrated: () => mockHasHydrated,
  useSelectedCharacter: () => mockSelected,
  useAuthenticatedContracts: () => mockContracts,
}));

const mockLogin = jest.fn();
jest.mock("~/lib/eveOnlineLogin", () => ({
  loginWithEveOnline: (...args: unknown[]) => mockLogin(...args),
}));

jest.mock("@jitaspace/eve-icons", () => {
  return new Proxy({}, { get: () => () => null });
});
// Presentational pieces render their children; ISK amounts render the amount,
// and the login button is a plain button.
jest.mock("@jitaspace/ui", () => {
  const React = require("react");
  const passThrough = ({ children }: { children?: ReactNode }) =>
    children == null
      ? null
      : React.createElement(React.Fragment, null, children);
  const parts: Record<string, unknown> = {
    ISKAmount: ({ amount }: { amount: number }) =>
      React.createElement("span", null, `${amount} ISK`),
    LoginWithEveOnlineButton: ({ onClick }: { onClick: () => void }) =>
      React.createElement("button", { onClick }, "Log in with EVE Online"),
  };
  return new Proxy(parts, {
    get: (target, key: string) => target[key] ?? passThrough,
  });
});
jest.mock("@jitaspace/eve-components", () => {
  const React = require("react");
  const passThrough = ({ children }: { children?: ReactNode }) =>
    children == null
      ? null
      : React.createElement(React.Fragment, null, children);
  return new Proxy({}, { get: () => passThrough });
});

const { MyContracts, CONTRACT_SCOPES } =
  require("~/app/contracts/MyContracts") as typeof MyContractsModule;

const CHARACTER = 90000001;
const CORPORATION = 98000001;

const FILTERS: ContractFilters = {
  type: "all",
  regionId: null,
  q: "",
  minPrice: null,
  maxPrice: null,
  sort: "newest",
  page: 1,
};

function esiContract(
  overrides: Partial<AuthenticatedContract> = {},
): AuthenticatedContract {
  return {
    contract_id: 1,
    type: "item_exchange",
    status: "outstanding",
    availability: "public",
    title: "Contract",
    issuer_id: CHARACTER,
    issuer_corporation_id: CORPORATION,
    assignee_id: 0,
    acceptor_id: 0,
    for_corporation: false,
    date_issued: "2026-11-01T00:00:00Z",
    date_expired: "2026-11-30T00:00:00Z",
    price: 1_000_000,
    reward: 0,
    collateral: 0,
    buyout: 0,
    volume: 1,
    days_to_complete: 0,
    start_location_id: 60003760,
    end_location_id: 60003760,
    sources: [{ kind: "character", subjectId: CHARACTER }],
    ...overrides,
  };
}

function signedIn(data: AuthenticatedContract[], overrides = {}) {
  mockContracts = {
    data,
    isPending: false,
    errors: [],
    characterIds: [CHARACTER],
    corporationIds: [CORPORATION],
    ...overrides,
  };
}

const renderMine = (filters: Partial<ContractFilters> = {}) =>
  render(
    <MantineProvider>
      <MyContracts filters={{ ...FILTERS, ...filters }} view="rows" />
    </MantineProvider>,
  );

/** The contracts listed, by the title each row shows, in order. */
const listedTitles = () =>
  screen
    .queryAllByRole("link")
    .filter((link) => link.getAttribute("href")?.startsWith("/contracts/"))
    .map((link) => link.textContent);

beforeEach(() => {
  mockHasHydrated = true;
  mockSelected = null;
  mockLogin.mockReset();
  signedIn([]);
});

describe("MyContracts: signing in", () => {
  it("renders nothing until the persisted login has loaded", () => {
    mockHasHydrated = false;
    renderMine();
    expect(screen.queryByText("Your contracts")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("asks a signed-out visitor to sign in", () => {
    signedIn([], { characterIds: [], corporationIds: [] });
    renderMine();
    expect(
      screen.getByText(/Sign in with EVE Online to see the contracts/),
    ).toBeInTheDocument();
    // Nothing to count yet.
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("asks a signed-in character for the contract scopes, keeping theirs", () => {
    signedIn([], { characterIds: [], corporationIds: [] });
    mockSelected = {
      accessTokenPayload: {
        scp: ["esi-mail.read_mail.v1", CONTRACT_SCOPES[0]!],
      },
    };
    renderMine();
    expect(
      screen.getByText(/Grant JitaSpace access to your contracts/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /log in/i }));
    expect(mockLogin).toHaveBeenCalledWith([
      "esi-mail.read_mail.v1",
      ...CONTRACT_SCOPES,
    ]);
  });
});

describe("MyContracts: which contracts are yours", () => {
  it("keeps open contracts issued by you, or for your corporation", () => {
    signedIn([
      esiContract({ contract_id: 1, title: "Mine" }),
      esiContract({
        contract_id: 2,
        title: "Corp's",
        issuer_id: 90000099,
        for_corporation: true,
      }),
      // Someone else's, assigned to you.
      esiContract({
        contract_id: 3,
        title: "Assigned",
        issuer_id: 90000099,
        issuer_corporation_id: 98000099,
      }),
      // A corpmate's personal contract, read from the corporation listing.
      esiContract({ contract_id: 4, title: "Corpmate", issuer_id: 90000099 }),
      esiContract({ contract_id: 5, title: "Done", status: "finished" }),
    ]);
    renderMine();
    expect(listedTitles()).toEqual(["Mine", "Corp's"]);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows a skeleton while ESI is still answering", () => {
    signedIn([], { isPending: true });
    const { container } = renderMine();
    expect(container.querySelector(".mantine-Skeleton-root")).not.toBeNull();
    expect(screen.queryByText(/has an open contract/)).not.toBeInTheDocument();
  });

  it("says when you have no open contracts", () => {
    signedIn([esiContract({ status: "finished" })]);
    renderMine();
    expect(
      screen.getByText(
        "None of your characters or corporations has an open contract.",
      ),
    ).toBeInTheDocument();
  });

  it("warns when some listings failed, and shows the rest", () => {
    signedIn([esiContract({ title: "Mine" })], {
      errors: [{ kind: "corporation", subjectId: CORPORATION }],
    });
    renderMine();
    expect(
      screen.getByText(/ESI did not return the contracts of 1 of your/),
    ).toBeInTheDocument();
    expect(listedTitles()).toEqual(["Mine"]);
  });

  it("explains that the region filter does not apply to your contracts", () => {
    signedIn([esiContract({ title: "Mine" })]);
    renderMine({ regionId: 10000002 });
    expect(
      screen.getByText(/The region filter applies to public contracts only/),
    ).toBeInTheDocument();
    expect(listedTitles()).toEqual(["Mine"]);
  });
});

describe("MyContracts: filters", () => {
  const contracts = [
    esiContract({
      contract_id: 1,
      title: "Cheap Rifter",
      price: 500_000,
      date_issued: "2026-11-03T00:00:00Z",
      date_expired: "2026-11-20T00:00:00Z",
    }),
    esiContract({
      contract_id: 2,
      type: "courier",
      title: "Haul to Amarr",
      price: 0,
      reward: 20_000_000,
      date_issued: "2026-11-01T00:00:00Z",
      date_expired: "2026-11-10T00:00:00Z",
    }),
    esiContract({
      contract_id: 3,
      type: "auction",
      title: "Rare BPC",
      price: 80_000_000,
      date_issued: "2026-11-02T00:00:00Z",
      date_expired: "2026-11-25T00:00:00Z",
    }),
    // "Want to buy": the issuer pays the reward, and the price is 0.
    esiContract({
      contract_id: 4,
      title: "WTB Drake",
      price: 0,
      reward: 40_000_000,
      date_issued: "2026-10-30T00:00:00Z",
      date_expired: "2026-11-28T00:00:00Z",
    }),
  ];

  beforeEach(() => signedIn(contracts));

  it("filters by type, counting what is hidden", () => {
    renderMine({ type: "courier" });
    expect(listedTitles()).toEqual(["Haul to Amarr"]);
    expect(screen.getByText("1 of 4")).toBeInTheDocument();
  });

  it("searches titles case-insensitively", () => {
    renderMine({ q: "rifter" });
    expect(listedTitles()).toEqual(["Cheap Rifter"]);
  });

  it("filters on the amount each row shows", () => {
    renderMine({ minPrice: 10_000_000, maxPrice: 50_000_000 });
    // The courier's reward and the "want to buy" exchange's reward both count.
    expect(listedTitles()).toEqual(["Haul to Amarr", "WTB Drake"]);
  });

  it("keeps a 'want to buy' exchange under a price filter", () => {
    renderMine({ type: "item_exchange", minPrice: 1 });
    expect(listedTitles()).toEqual(["Cheap Rifter", "WTB Drake"]);
  });

  it("says when filters hide every contract", () => {
    renderMine({ q: "nothing like this" });
    expect(
      screen.getByText("None of your open contracts match these filters."),
    ).toBeInTheDocument();
    expect(screen.getByText("0 of 4")).toBeInTheDocument();
  });

  it.each([
    ["newest", ["Cheap Rifter", "Rare BPC", "Haul to Amarr", "WTB Drake"]],
    ["oldest", ["WTB Drake", "Haul to Amarr", "Rare BPC", "Cheap Rifter"]],
    ["expiring", ["Haul to Amarr", "Cheap Rifter", "Rare BPC", "WTB Drake"]],
    ["price-desc", ["Rare BPC", "WTB Drake", "Haul to Amarr", "Cheap Rifter"]],
    ["price-asc", ["Cheap Rifter", "Haul to Amarr", "WTB Drake", "Rare BPC"]],
  ] as const)("sorts %s", (sort, expected) => {
    renderMine({ sort });
    expect(listedTitles()).toEqual(expected);
  });

  it("puts contracts without an amount last whichever way price sorts", () => {
    signedIn([
      esiContract({ contract_id: 1, title: "Free", price: 0 }),
      esiContract({ contract_id: 2, title: "Paid", price: 5 }),
    ]);
    const { unmount } = renderMine({ sort: "price-desc" });
    expect(listedTitles()).toEqual(["Paid", "Free"]);
    unmount();
    renderMine({ sort: "price-asc" });
    expect(listedTitles()).toEqual(["Paid", "Free"]);
  });

  it("lays them out as the chosen view", () => {
    render(
      <MantineProvider>
        <MyContracts filters={FILTERS} view="cards" />
      </MantineProvider>,
    );
    expect(listedTitles()).toHaveLength(4);
  });
});
