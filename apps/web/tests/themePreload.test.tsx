import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  DEFAULT_THEME,
  mergeMantineTheme,
  useMantineTheme,
  v8CssVariablesResolver,
} from "@mantine/core";
import { render } from "@testing-library/react";

import type * as MantineProviderModule from "~/app/mantine-provider";
import type * as ThemePreloadModule from "~/lib/themePreload";
import {
  APP_THEME_OPTIONS,
  DEFAULT_APP_THEME,
  PREFERENCES_STORAGE_KEY,
  usePreferencesStore,
} from "~/lib/preferences";
import {
  THEME_PENDING_ATTRIBUTE,
  THEME_PRELOAD,
  THEME_PRELOAD_SCRIPT,
} from "~/lib/themePreload";
import { themes } from "~/themes";

// Records which theme was rendered last whenever the provider reveals the page.
const revealedWith: string[] = [];
let lastRenderedPrimary = "";
jest.mock("~/lib/themePreload", () => {
  const actual =
    jest.requireActual<typeof ThemePreloadModule>("~/lib/themePreload");
  return {
    ...actual,
    revealPrePaintTheme: () => {
      revealedWith.push(lastRenderedPrimary);
      actual.revealPrePaintTheme();
    },
  };
});

// Imported after the mock is registered.
const { AppMantineProvider } = jest.requireActual<typeof MantineProviderModule>(
  "~/app/mantine-provider",
);

const html = document.documentElement;

function store(value: string | null) {
  if (value === null) localStorage.removeItem(PREFERENCES_STORAGE_KEY);
  else localStorage.setItem(PREFERENCES_STORAGE_KEY, value);
}

function runScript() {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(THEME_PRELOAD_SCRIPT)();
}

function reset() {
  localStorage.clear();
  html.removeAttribute(THEME_PENDING_ATTRIBUTE);
  html.removeAttribute("style");
  usePreferencesStore.setState({ appTheme: DEFAULT_APP_THEME });
  revealedWith.length = 0;
}

beforeEach(reset);
afterEach(reset);

describe("THEME_PRELOAD", () => {
  const selectable = APP_THEME_OPTIONS.map((o) => o.value).filter(
    (value) => value !== DEFAULT_APP_THEME,
  );

  it("covers exactly the selectable non-default themes", () => {
    expect(Object.keys(THEME_PRELOAD).sort()).toEqual([...selectable].sort());
  });

  it.each(selectable)("matches the %s theme", (name) => {
    const theme = mergeMantineTheme(DEFAULT_THEME, themes[name]);
    // The body colour is dark[7] for as long as the resolver says so.
    expect(v8CssVariablesResolver(theme).dark["--mantine-color-body"]).toBe(
      "var(--mantine-color-dark-7)",
    );
    expect(THEME_PRELOAD[name]).toEqual({
      body: theme.colors.dark[7],
      background: theme.other.appBackground,
    });
  });
});

describe("THEME_PRELOAD_SCRIPT", () => {
  it("marks the page pending with the stored theme's colours", () => {
    store(JSON.stringify({ state: { appTheme: "caldari" }, version: 0 }));
    runScript();
    expect(html.getAttribute(THEME_PENDING_ATTRIBUTE)).toBe("caldari");
    expect(html.style.getPropertyValue("--app-pending-body")).toBe("#111111");
    expect(html.style.getPropertyValue("--app-pending-background")).toBe(
      THEME_PRELOAD.caldari.background,
    );
  });

  it("normalises the stored value like sanitizeAppTheme", () => {
    store(JSON.stringify({ state: { appTheme: "  WHPD " } }));
    runScript();
    expect(html.getAttribute(THEME_PENDING_ATTRIBUTE)).toBe("whpd");
  });

  it.each([
    ["nothing stored", null],
    ["the default theme", JSON.stringify({ state: { appTheme: "default" } })],
    ["an unknown theme", JSON.stringify({ state: { appTheme: "jove" } })],
    ["an inherited key", JSON.stringify({ state: { appTheme: "toString" } })],
    ["a non-string theme", JSON.stringify({ state: { appTheme: 3 } })],
    ["no state", JSON.stringify({ version: 0 })],
    ["malformed JSON", "{not json"],
  ])("leaves the page alone given %s", (_, value) => {
    store(value);
    expect(runScript).not.toThrow();
    expect(html.hasAttribute(THEME_PENDING_ATTRIBUTE)).toBe(false);
    expect(html.getAttribute("style")).toBeNull();
  });

  it("cannot close its own <script> tag", () => {
    expect(THEME_PRELOAD_SCRIPT).not.toMatch(/<\/script/i);
  });
});

describe("AppMantineProvider", () => {
  function Probe() {
    lastRenderedPrimary = useMantineTheme().primaryColor;
    return null;
  }

  it("reveals the page only after rendering the stored theme", () => {
    store(JSON.stringify({ state: { appTheme: "eve" }, version: 0 }));
    runScript();
    expect(html.hasAttribute(THEME_PENDING_ATTRIBUTE)).toBe(true);

    render(
      <AppMantineProvider>
        <Probe />
      </AppMantineProvider>,
    );

    expect(revealedWith).toEqual([themes.eve.primaryColor]);
    expect(html.hasAttribute(THEME_PENDING_ATTRIBUTE)).toBe(false);
    expect(html.style.getPropertyValue("--app-pending-body")).toBe("");
    expect(html.style.getPropertyValue("--app-pending-background")).toBe("");
  });

  it("reveals once for the default theme too", () => {
    render(
      <AppMantineProvider>
        <Probe />
      </AppMantineProvider>,
    );
    expect(revealedWith).toEqual([DEFAULT_THEME.primaryColor]);
  });
});
