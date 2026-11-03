import { describe, expect, it } from "@jest/globals";

import { getPaginationControlProps } from "../pagination";

describe("getPaginationControlProps", () => {
  it.each([
    ["first", "First page"],
    ["previous", "Previous page"],
    ["next", "Next page"],
    ["last", "Last page"],
  ] as const)("names the %s control", (control, label) => {
    expect(getPaginationControlProps(control)).toEqual({ "aria-label": label });
  });
});
