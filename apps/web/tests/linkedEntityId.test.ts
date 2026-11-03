import { describe, expect, it } from "@jest/globals";

import { getLinkedEntityId } from "~/components/EveMail/Editor/linkedEntityId";

describe("getLinkedEntityId", () => {
  it.each([
    ["showinfo:16159//99000001", ["alliance"], "99000001"],
    ["showinfo:30//500003", ["faction"], "500003"],
    ["showinfo:587", ["type"], "587"],
    // Every character type id resolves, not only the 1373 the editor writes.
    ["showinfo:1377//93345033", ["character"], "93345033"],
    [
      "showinfo:35832//1035466617946",
      ["station", "structure"],
      "1035466617946",
    ],
  ])("reads the id out of %s", (href, routes, expected) => {
    expect(getLinkedEntityId(href, routes)).toBe(expected);
  });

  it.each([
    ["a link to a different kind of entity", "showinfo:1373//93345033"],
    ["a plain URL", "https://www.jita.space"],
    ["a non-showinfo EVE link", "killReport:123"],
    ["an unrecognised showinfo type", "showinfo:9999//12345"],
    ["a showinfo link with no id", "showinfo:16159//"],
    ["an empty href", ""],
  ])("returns an empty string for %s", (_name, href) => {
    expect(getLinkedEntityId(href, ["alliance"])).toBe("");
  });

  it.each([undefined, null, 42])(
    "returns an empty string for a non-string href (%p)",
    (href) => {
      expect(getLinkedEntityId(href, ["alliance"])).toBe("");
    },
  );
});
