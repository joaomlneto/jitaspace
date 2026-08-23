import {
  getAcceptLanguage,
  setAcceptLanguage,
  setConfig,
  setUserAgent,
  subscribeToAcceptLanguage,
  updateConfig,
} from "./client";

// ESI localises the names it serves, so any cache keyed on an ESI answer has to
// treat Accept-Language as part of its identity. Module-level caches in
// @jitaspace/hooks cannot be reached from the app's provider tree, so they
// subscribe to the client instead — which makes these two properties
// load-bearing, and pins them here:
//
//  1. a language change MUST notify, or stale localised names survive it; and
//  2. a config write that leaves the language alone MUST NOT notify, or every
//     `setUserAgent`/`updateConfig` call (they happen on every auth-adjacent
//     update) throws away caches that are still perfectly valid.
//
// The module keeps global state, so every test resets it via `setConfig({})`
// and every subscription is torn down in afterEach — a listener leaking into
// the next test would see that reset fire and corrupt its call counts.

describe("client accept-language subscription", () => {
  const unsubscribers: (() => void)[] = [];

  /** Subscribe and register the teardown so nothing leaks between tests. */
  const subscribe = (listener: () => void) => {
    const unsubscribe = subscribeToAcceptLanguage(listener);
    unsubscribers.push(unsubscribe);
    return unsubscribe;
  };

  beforeEach(() => {
    setConfig({});
  });

  afterEach(() => {
    while (unsubscribers.length > 0) {
      unsubscribers.pop()?.();
    }
    setConfig({});
  });

  it("reports the configured language, and undefined when unset or blank", () => {
    expect(getAcceptLanguage()).toBeUndefined();

    setAcceptLanguage("de");
    expect(getAcceptLanguage()).toBe("de");

    // A blank/whitespace-only value is not a language: it must read as unset,
    // otherwise a cache would key entries under "   " and never match again.
    setAcceptLanguage("   ");
    expect(getAcceptLanguage()).toBeUndefined();

    setAcceptLanguage("fr");
    expect(getAcceptLanguage()).toBe("fr");

    setAcceptLanguage(undefined);
    expect(getAcceptLanguage()).toBeUndefined();

    setConfig({ acceptLanguage: "" });
    expect(getAcceptLanguage()).toBeUndefined();
  });

  it("notifies subscribers when setAcceptLanguage changes the language", () => {
    const listener = jest.fn();
    subscribe(listener);

    setAcceptLanguage("de");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getAcceptLanguage()).toBe("de");
  });

  it("stops notifying once the returned unsubscribe is called", () => {
    const listener = jest.fn();
    const unsubscribe = subscribe(listener);

    setAcceptLanguage("de");
    expect(listener).toHaveBeenCalledTimes(1);

    expect(typeof unsubscribe).toBe("function");
    unsubscribe();

    setAcceptLanguage("fr");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("notifies every subscriber, and only the ones still subscribed", () => {
    const first = jest.fn();
    const second = jest.fn();
    const third = jest.fn();
    subscribe(first);
    subscribe(second);
    const unsubscribeThird = subscribe(third);

    setAcceptLanguage("de");

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(third).toHaveBeenCalledTimes(1);

    unsubscribeThird();
    setAcceptLanguage("fr");

    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
    expect(third).toHaveBeenCalledTimes(1);
  });

  it("notifies on setConfig only when it moves the resolved language", () => {
    const listener = jest.fn();
    subscribe(listener);

    setConfig({ acceptLanguage: "de" });
    expect(listener).toHaveBeenCalledTimes(1);

    // Same language, different config object: the resolved language has not
    // moved, so nobody's cache is stale.
    setConfig({ acceptLanguage: "de", userAgent: "agent/1.0" });
    expect(listener).toHaveBeenCalledTimes(1);

    // Dropping the language entirely IS a move, back to unset.
    setConfig({});
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getAcceptLanguage()).toBeUndefined();

    // ...and blank is indistinguishable from unset, so it must stay quiet.
    setConfig({ acceptLanguage: "  " });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("does not notify when a config write leaves the language alone", () => {
    setAcceptLanguage("de");

    const listener = jest.fn();
    subscribe(listener);

    // This is the whole point of notifyIfAcceptLanguageChanged: unrelated
    // config writes are frequent, and treating them as language changes would
    // invalidate every localised cache in the app for nothing.
    updateConfig({ userAgent: "x" });
    expect(listener).not.toHaveBeenCalled();

    setUserAgent("y");
    updateConfig({ headers: { Authorization: "Bearer token" } });
    updateConfig({ baseURL: "https://esi.evetech.net" });
    expect(listener).not.toHaveBeenCalled();

    // Re-setting the same language is also not a change.
    setAcceptLanguage("de");
    expect(listener).not.toHaveBeenCalled();

    // Sanity check that this listener was wired up at all.
    setAcceptLanguage("fr");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getAcceptLanguage()).toBe("fr");
  });
});
