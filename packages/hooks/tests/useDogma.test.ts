import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react";

// @swc/jest does not hoist jest.mock above imports, so the hooks are required
// lazily below.
const mockAttribute = jest.fn();
const mockAttributeIds = jest.fn();
const mockEffect = jest.fn();
const mockEffectIds = jest.fn();

jest.mock("@jitaspace/esi-client", () => ({
  __esModule: true,
  useGetDogmaAttributesAttributeId: (...args: unknown[]) =>
    mockAttribute(...args),
  useGetDogmaAttributes: (...args: unknown[]) => mockAttributeIds(...args),
  useGetDogmaEffectsEffectId: (...args: unknown[]) => mockEffect(...args),
  useGetDogmaEffects: (...args: unknown[]) => mockEffectIds(...args),
}));

const { useDogmaAttribute } =
  require("../src/hooks/dogma/useDogmaAttribute") as typeof import("../src/hooks/dogma/useDogmaAttribute");
const { useDogmaEffect } =
  require("../src/hooks/dogma/useDogmaEffect") as typeof import("../src/hooks/dogma/useDogmaEffect");

// These hooks used to pass `enabled: ids?.data.includes(id)`: undefined while
// the id list loaded, which react-query treats as enabled, so the gate never
// gated — and passing `enabled` at all overrode the generated hook's own
// `!!id` guard. They now pass no options, so that guard applies, and they no
// longer download the full id list.
describe("dogma hooks", () => {
  beforeEach(() => {
    for (const mock of [
      mockAttribute,
      mockAttributeIds,
      mockEffect,
      mockEffectIds,
    ]) {
      mock.mockReset();
    }
  });

  it("useDogmaAttribute leaves the generated enabled guard in place", () => {
    renderHook(() => useDogmaAttribute(9));

    expect(mockAttribute).toHaveBeenCalledWith(9);
    expect(mockAttributeIds).not.toHaveBeenCalled();
  });

  it("useDogmaEffect leaves the generated enabled guard in place", () => {
    renderHook(() => useDogmaEffect(11));

    expect(mockEffect).toHaveBeenCalledWith(11);
    expect(mockEffectIds).not.toHaveBeenCalled();
  });
});
