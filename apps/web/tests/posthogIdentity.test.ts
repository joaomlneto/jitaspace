import { beforeEach, describe, expect, it } from "@jest/globals";
import posthog from "posthog-js";

import {
  getDistinctIdMock,
  identifyMock,
  registerMock,
  resetMock,
} from "../__mocks__/posthogMocks";
import { syncPosthogIdentity } from "../lib/posthogIdentity";

const ANONYMOUS_ID = "0199a1b2-anon";

describe("syncPosthogIdentity", () => {
  beforeEach(() => {
    identifyMock.mockReset();
    registerMock.mockReset();
    resetMock.mockReset();
    getDistinctIdMock.mockReset();
    getDistinctIdMock.mockReturnValue(ANONYMOUS_ID);
    (posthog as { __loaded: boolean }).__loaded = true;
  });

  it("identifies an anonymous browser that holds a session", () => {
    syncPosthogIdentity({
      characterIds: [90000001],
      selectedCharacter: 90000001,
    });

    expect(identifyMock).toHaveBeenCalledTimes(1);
    expect(identifyMock).toHaveBeenCalledWith("90000001", {
      eve_character_id: 90000001,
    });
  });

  it("marks later events as signed in, with the number of characters", () => {
    syncPosthogIdentity({
      characterIds: [90000001, 90000002],
      selectedCharacter: 90000002,
    });

    expect(registerMock).toHaveBeenCalledWith({
      signed_in: true,
      character_count: 2,
    });
  });

  it("leaves a browser alone that is already known as the selected character", () => {
    getDistinctIdMock.mockReturnValue("90000001");

    syncPosthogIdentity({
      characterIds: [90000001],
      selectedCharacter: 90000001,
    });

    expect(identifyMock).not.toHaveBeenCalled();
  });

  it("keeps one person when the selected character changes", () => {
    // Known as the first character; the player then switches to the second.
    getDistinctIdMock.mockReturnValue("90000001");

    syncPosthogIdentity({
      characterIds: [90000001, 90000002],
      selectedCharacter: 90000002,
    });

    expect(identifyMock).not.toHaveBeenCalled();
  });

  it("identifies again when the known character is no longer in the session", () => {
    getDistinctIdMock.mockReturnValue("90000001");

    syncPosthogIdentity({
      characterIds: [90000002],
      selectedCharacter: 90000002,
    });

    expect(identifyMock).toHaveBeenCalledWith("90000002", {
      eve_character_id: 90000002,
    });
  });

  it("falls back to the first character when none is selected", () => {
    syncPosthogIdentity({
      characterIds: [90000005, 90000009],
      selectedCharacter: null,
    });

    expect(identifyMock).toHaveBeenCalledWith("90000005", {
      eve_character_id: 90000005,
    });
  });

  it("marks a browser without a session as signed out, without identifying or resetting", () => {
    syncPosthogIdentity({ characterIds: [], selectedCharacter: null });

    expect(registerMock).toHaveBeenCalledWith({
      signed_in: false,
      character_count: 0,
    });
    expect(identifyMock).not.toHaveBeenCalled();
    expect(resetMock).not.toHaveBeenCalled();
  });

  it("does nothing when PostHog was never initialised", () => {
    (posthog as { __loaded: boolean }).__loaded = false;

    syncPosthogIdentity({
      characterIds: [90000001],
      selectedCharacter: 90000001,
    });

    expect(registerMock).not.toHaveBeenCalled();
    expect(identifyMock).not.toHaveBeenCalled();
  });
});
