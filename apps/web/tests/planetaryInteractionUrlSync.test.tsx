import "@testing-library/jest-dom/jest-globals";

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { act, screen } from "@testing-library/react";
import { NuqsAdapter } from "nuqs/adapters/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { CATALOG } from "./planetaryInteractionFixtures";

// The PI pages are prerendered and read their filters through the React nuqs
// adapter, which only sees the URL after hydration: the server snapshot is
// empty. withNuqsTestingAdapter hands the URL over on the first render, so it
// cannot show a component that copies a URL value into state once. These
// tests go through the adapter the pages use, and a real hydration.
jest.mock("@jitaspace/eve-components", () => ({
  TypeAvatar: () => null,
  TypeName: ({ typeId }: { typeId?: number }) => (
    <span>{`type-${typeId}`}</span>
  ),
}));

const { SchematicsBrowser } =
  require("~/components/PlanetaryInteraction/SchematicsBrowser") as typeof import("~/components/PlanetaryInteraction/SchematicsBrowser");

function Browser() {
  return (
    <MantineProvider>
      <NuqsAdapter>
        <SchematicsBrowser catalog={CATALOG} />
      </NuqsAdapter>
    </MantineProvider>
  );
}

let root: ReturnType<typeof hydrateRoot> | undefined;

/** Server-render with no URL, as the build does, then hydrate at `search`. */
async function hydrateAt(search: string) {
  window.history.replaceState(
    null,
    "",
    `/planetary-interaction/schematics${search}`,
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  container.innerHTML = renderToString(<Browser />);
  await act(async () => {
    root = hydrateRoot(container, <Browser />, {
      // The prerender cannot know the URL, so the first client render differs
      // from it by design; that is not what these tests are about.
      onRecoverableError: () => undefined,
    });
    await Promise.resolve();
  });
}

const searchBox = () =>
  screen.getByRole<HTMLInputElement>("textbox", { name: "Search" });

describe("Schematics browser URL state", () => {
  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/");
  });

  it("applies a shared search link on a full page load", async () => {
    await hydrateAt("?q=ionic");

    expect(searchBox().value).toBe("ionic");
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("follows the URL when it changes on its own, as back/forward does", async () => {
    await hydrateAt("");
    expect(screen.getAllByRole("article")).toHaveLength(3);

    await act(async () => {
      window.history.pushState(null, "", "?q=coolant");
      window.dispatchEvent(new PopStateEvent("popstate"));
      await Promise.resolve();
    });

    expect(searchBox().value).toBe("coolant");
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("ignores tiers that do not exist", async () => {
    await hydrateAt("?tier=7");

    // As if no tier were named: every chip checked, every schematic shown.
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.getByRole("checkbox", { name: "P2" })).toBeChecked();
  });
});
