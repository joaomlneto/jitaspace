import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type * as FileRouteModule from "~/app/file/[...path]/page";
import type * as StringRouteModule from "~/app/string/[stringId]/page";

const mockStringHistory = jest.fn<(id: number) => Promise<unknown>>();
const mockFileHistory = jest.fn<(path: string) => Promise<unknown>>();

jest.mock("~/app/string/[stringId]/data", () => ({
  getCachedStringHistory: (id: number) => mockStringHistory(id),
}));
jest.mock("~/app/file/[...path]/data", () => ({
  getCachedFileHistory: (path: string) => mockFileHistory(path),
}));
const probe = () => null;
jest.mock("~/app/string/[stringId]/page.client", () => ({
  __esModule: true,
  default: probe,
}));
jest.mock("~/app/file/[...path]/page.client", () => ({
  __esModule: true,
  default: probe,
}));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const StringRoute =
  require("~/app/string/[stringId]/page") as typeof StringRouteModule;
const FileRoute =
  require("~/app/file/[...path]/page") as typeof FileRouteModule;

/** Resolve the async child inside the page's Suspense; return the element it renders. */
async function renderContent<P>(
  Page: (p: { params: Promise<P> }) => ReactElement<{ children: ReactElement }>,
  params: P,
): Promise<ReactElement<Record<string, unknown>>> {
  const child = Page({ params: Promise.resolve(params) }).props.children;
  return (
    child.type as (p: unknown) => Promise<ReactElement<Record<string, unknown>>>
  )(child.props);
}

/** The props handed to the client page, under the optional NuqsAdapter. */
function clientProps(element: ReactElement<Record<string, unknown>>) {
  const inner = element.props.children as
    | ReactElement<Record<string, unknown>>
    | undefined;
  return (inner ?? element).props;
}

beforeEach(() => {
  mockStringHistory.mockReset();
  mockFileHistory.mockReset();
});

describe("/string/[stringId]", () => {
  const history = {
    stringId: 7,
    languages: ["en-us"],
    events: [
      {
        build: 1,
        date: null,
        server: "tranquility",
        lang: "en-us",
        op: "added",
        to: "Hi there",
      },
      {
        build: 2,
        date: null,
        server: "tranquility",
        lang: "de",
        op: "added",
        to: "Hallo",
      },
    ],
  };

  it("prerenders only a placeholder the page 404s before querying", async () => {
    expect(StringRoute.generateStaticParams()).toEqual([{ stringId: "0" }]);
    await expect(
      renderContent(StringRoute.default, { stringId: "0" }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockStringHistory).not.toHaveBeenCalled();
  });

  it("404s a string with no recorded changes", async () => {
    mockStringHistory.mockResolvedValue(null);
    await expect(
      renderContent(StringRoute.default, { stringId: "7" }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("hands the history to the client page", async () => {
    mockStringHistory.mockResolvedValue(history);
    const element = await renderContent(StringRoute.default, { stringId: "7" });
    expect(clientProps(element)).toEqual({ history });
    expect(mockStringHistory).toHaveBeenCalledWith(7);
  });

  it("describes itself with the English text", async () => {
    mockStringHistory.mockResolvedValue(history);
    const metadata = await StringRoute.generateMetadata({
      params: Promise.resolve({ stringId: "7" }),
    });
    expect(metadata.title).toBe("String 7 — Change History");
    expect(metadata.description).toBe("Hi there");
    expect(metadata.alternates?.canonical).toContain("/string/7");
  });

  it("falls back to a generic description, and to nothing for a bad id", async () => {
    mockStringHistory.mockRejectedValue(new Error("down"));
    const metadata = await StringRoute.generateMetadata({
      params: Promise.resolve({ stringId: "7" }),
    });
    expect(metadata.description).toMatch(/localization string 7/);
    expect(
      await StringRoute.generateMetadata({
        params: Promise.resolve({ stringId: "07" }),
      }),
    ).toEqual({});
  });
});

describe("/file/[...path]", () => {
  const history = { path: "res:/ui/a.png", events: [] };

  it("prerenders only a placeholder the page 404s before querying", async () => {
    expect(FileRoute.generateStaticParams()).toEqual([{ path: ["_"] }]);
    await expect(
      renderContent(FileRoute.default, { path: ["_"] }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockFileHistory).not.toHaveBeenCalled();
  });

  it("404s a file with no recorded changes", async () => {
    mockFileHistory.mockResolvedValue(null);
    await expect(
      renderContent(FileRoute.default, { path: ["res:", "nope"] }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("rebuilds the path from the segments and hands over the history", async () => {
    mockFileHistory.mockResolvedValue(history);
    const element = await renderContent(FileRoute.default, {
      path: ["res%3A", "ui", "a.png"],
    });
    expect(mockFileHistory).toHaveBeenCalledWith("res:/ui/a.png");
    expect(clientProps(element)).toEqual({ history });
  });

  it("describes itself by the file's name and path", async () => {
    const metadata = await FileRoute.generateMetadata({
      params: Promise.resolve({ path: ["res:", "ui", "a.png"] }),
    });
    expect(metadata.title).toBe("a.png — File History");
    expect(metadata.description).toContain("res:/ui/a.png");
    expect(metadata.alternates?.canonical).toContain("/file/res:/ui/a.png");
    expect(
      await FileRoute.generateMetadata({
        params: Promise.resolve({ path: ["x"] }),
      }),
    ).toEqual({});
  });
});
