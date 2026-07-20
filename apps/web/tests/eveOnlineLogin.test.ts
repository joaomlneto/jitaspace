import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { captureMock } from "../__mocks__/posthogMocks";
import { loginWithEveOnline } from "../lib/eveOnlineLogin";

beforeEach(() => {
  captureMock.mockClear();
  // loginWithEveOnline calls window.location.assign, which jsdom reports as an
  // unimplemented navigation (a console error, not a throw); silence it.
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("loginWithEveOnline", () => {
  it("captures login_initiated with the requested scope count", () => {
    loginWithEveOnline(["publicData", "esi-skills.read_skills.v1"]);

    expect(captureMock).toHaveBeenCalledWith("login_initiated", {
      scope_count: 2,
    });
  });

  it("counts only the unique scopes requested", () => {
    loginWithEveOnline(["publicData", "publicData"]);

    expect(captureMock).toHaveBeenCalledWith("login_initiated", {
      scope_count: 1,
    });
  });
});
