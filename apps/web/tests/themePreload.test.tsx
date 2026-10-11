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
import { DEFAULT_THEME_SEASON_END } from "~/themes/season";

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

// The clock the pre-paint script and the provider read. Pinned inside the
// Default theme's season unless a test moves it past the end.
let now = DEFAULT_THEME_SEASON_END - 24 * 60 * 60 * 1000;
jest.spyOn(Date, "now").mockImplementation(() => now);

function reset() {
  now = DEFAULT_THEME_SEASON_END - 24 * 60 * 60 * 1000;
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
    // The body colour is the theme's white (light) and dark[7] (dark) for as
    // long as the resolver says so.
    const resolved = v8CssVariablesResolver(theme);
    expect(resolved.light["--mantine-color-body"]).toBe(theme.white);
    expect(resolved.dark["--mantine-color-body"]).toBe(
      "var(--mantine-color-dark-7)",
    );
    expect(THEME_PRELOAD[name]).toEqual({
      body: `light-dark(${theme.white}, ${theme.colors.dark[7]})`,
      background: theme.other.appBackground,
      backgroundMobile: theme.other.appBackgroundMobile,
    });
  });
});

describe("THEME_PRELOAD_SCRIPT", () => {
  it("marks the page pending with the stored theme's colours", () => {
    store(JSON.stringify({ state: { appTheme: "caldari" }, version: 0 }));
    runScript();
    expect(html.getAttribute(THEME_PENDING_ATTRIBUTE)).toBe("caldari");
    expect(html.style.getPropertyValue("--app-pending-body")).toBe(
      "light-dark(#f2f7fb, #111111)",
    );
    expect(html.style.getPropertyValue("--app-pending-background")).toBe(
      THEME_PRELOAD.caldari.background,
    );
    expect(html.style.getPropertyValue("--app-pending-background-mobile")).toBe(
      THEME_PRELOAD.caldari.backgroundMobile,
    );
  });

  it("normalises the stored value like sanitizeAppTheme", () => {
    store(JSON.stringify({ state: { appTheme: "  WHPD " } }));
    runScript();
    expect(html.getAttribute(THEME_PENDING_ATTRIBUTE)).toBe("whpd");
  });

  it("marks Minimal pending with its body colour and no wallpaper", () => {
    store(JSON.stringify({ state: { appTheme: "minimal" } }));
    runScript();
    expect(html.getAttribute(THEME_PENDING_ATTRIBUTE)).toBe("minimal");
    expect(html.style.getPropertyValue("--app-pending-body")).toBe(
      "light-dark(#fff, #242424)",
    );
    expect(html.style.getPropertyValue("--app-pending-background")).toBe("");
  });

  it.each([
    ["nothing stored", null],
    ["the default theme", JSON.stringify({ state: { appTheme: "default" } })],
    ["an unknown theme", JSON.stringify({ state: { appTheme: "jove" } })],
    ["a removed theme", JSON.stringify({ state: { appTheme: "eve_v2" } })],
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

  it.each([
    ["nothing stored", null],
    ["Default", JSON.stringify({ state: { appTheme: "default" } })],
    ["an unknown theme", JSON.stringify({ state: { appTheme: "jove" } })],
    ["malformed JSON", "{not json"],
  ])("paints EVE for %s once the season is over", (_, value) => {
    now = DEFAULT_THEME_SEASON_END;
    store(value);
    runScript();
    expect(html.getAttribute(THEME_PENDING_ATTRIBUTE)).toBe("eve");
    expect(html.style.getPropertyValue("--app-pending-background")).toBe(
      THEME_PRELOAD.eve.background,
    );
  });

  it("still paints a chosen theme after the season", () => {
    now = DEFAULT_THEME_SEASON_END + 1000;
    store(JSON.stringify({ state: { appTheme: "caldari" } }));
    runScript();
    expect(html.getAttribute(THEME_PENDING_ATTRIBUTE)).toBe("caldari");
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
    expect(html.style.getPropertyValue("--app-pending-background-mobile")).toBe(
      "",
    );
  });

  it("reveals Default as EVE, already themed, once the season is over", () => {
    now = DEFAULT_THEME_SEASON_END;
    runScript();
    expect(html.getAttribute(THEME_PENDING_ATTRIBUTE)).toBe("eve");

    render(
      <AppMantineProvider>
        <Probe />
      </AppMantineProvider>,
    );

    expect(revealedWith).toEqual([themes.eve.primaryColor]);
    expect(html.hasAttribute(THEME_PENDING_ATTRIBUTE)).toBe(false);
  });

  it("reveals once for the default theme too", () => {
    render(
      <AppMantineProvider>
        <Probe />
      </AppMantineProvider>,
    );
    expect(revealedWith).toEqual([themes[DEFAULT_APP_THEME].primaryColor]);
  });
});
