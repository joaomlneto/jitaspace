import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  DEFAULT_TYPE_PAGE_TAB,
  isTypePageTab,
  TYPE_PAGE_TABS,
} from "~/app/type/[typeId]/tabs";

// next/navigation.redirect throws a NEXT_REDIRECT control-flow signal in real
// Next; mock it as a spy so we can assert the computed target instead.
const mockRedirect = jest.fn();
jest.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

// Require the route lazily so the jest.mock(...) factory above is active before
// the module is evaluated (SWC does not hoist jest.mock).
function getRedirectPage(): (props: {
  params: Promise<{ typeId: string; tab: string }>;
}) => Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
  return require("~/app/type/[typeId]/[tab]/page").default;
}

describe("isTypePageTab", () => {
  it.each(TYPE_PAGE_TABS)("accepts %s as a known tab", (tab) => {
    expect(isTypePageTab(tab)).toBe(true);
  });

  it("rejects unknown and nullish values", () => {
    expect(isTypePageTab("bogus")).toBe(false);
    expect(isTypePageTab("")).toBe(false);
    expect(isTypePageTab(null)).toBe(false);
    expect(isTypePageTab(undefined)).toBe(false);
  });

  it("uses overview as the default tab", () => {
    expect(DEFAULT_TYPE_PAGE_TAB).toBe("overview");
    expect(isTypePageTab(DEFAULT_TYPE_PAGE_TAB)).toBe(true);
  });
});

describe("/type/[typeId]/[tab] redirect route", () => {
  beforeEach(() => {
    mockRedirect.mockReset();
  });

  it("redirects to the canonical page with ?tab= for a known tab", async () => {
    const Page = getRedirectPage();
    await Page({ params: Promise.resolve({ typeId: "587", tab: "market" }) });
    expect(mockRedirect).toHaveBeenCalledWith("/type/587?tab=market");
  });

  it("drops the query for an unknown tab", async () => {
    const Page = getRedirectPage();
    await Page({ params: Promise.resolve({ typeId: "587", tab: "bogus" }) });
    expect(mockRedirect).toHaveBeenCalledWith("/type/587");
  });
});
