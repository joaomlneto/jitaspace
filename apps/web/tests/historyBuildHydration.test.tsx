import { afterEach, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { act } from "@testing-library/react";
import { NuqsAdapter } from "nuqs/adapters/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import type { BuildPage } from "~/lib/history";

// The build page is cached as one static render (ISR) shared by every URL of
// that build, so the cached HTML never reflects `?collections=`. This pins the
// contract that makes that safe: the page hydrates against the unfiltered HTML
// without a mismatch, and only then applies the filter from the URL.

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

const DATA: BuildPage = {
  build: 3532181,
  date: "2026-09-22",
  changes: [
    {
      entityId: 587,
      entityType: "type",
      collection: "types",
      kind: "modified",
    },
    { entityId: 12747, entityType: "skin", collection: "skins", kind: "added" },
  ],
  typeNames: { 587: "Rifter" },
  files: { added: [], changed: [], removed: [] },
  strings: {},
};

afterEach(() => {
  window.history.replaceState(null, "", "/");
  document.body.innerHTML = "";
});

it("hydrates the cached page cleanly, then narrows it to the URL's collections", async () => {
  const { default: BuildHistoryClient } =
    await import("~/app/history/build/[build]/page.client");
  const page = (
    <MantineProvider>
      <NuqsAdapter>
        <BuildHistoryClient data={DATA} />
      </NuqsAdapter>
    </MantineProvider>
  );
  // What the ISR cache holds: rendered with no URL state, so every collection.
  const html = renderToString(page);
  expect(html).toContain("Rifter");

  window.history.replaceState(
    null,
    "",
    "/history/build/3532181?collections=skins",
  );
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);

  const errors: unknown[] = [];
  const consoleError = jest
    .spyOn(console, "error")
    .mockImplementation((...args) => errors.push(args));
  try {
    act(() => {
      hydrateRoot(container, page, {
        onRecoverableError: (error) => errors.push(error),
      });
    });
  } finally {
    consoleError.mockRestore();
  }

  expect(errors).toEqual([]);
  expect(container.textContent).toContain("New skins");
  expect(container.textContent).not.toContain("Rifter");
});
