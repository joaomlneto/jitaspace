import { describe, expect, it, jest } from "@jest/globals";

import type * as HeaderMenuModule from "~/layouts/MainLayout/HeaderMenu/HeaderMenu";

jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("~/layouts/MainLayout/UserButton", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("~/components/ServerStatus/ServerStatusIndicator", () => ({
  ServerStatusIndicator: () => null,
}));
jest.mock("~/layouts/MainLayout/HeaderMenu/DesktopNavMenu", () => ({
  DesktopNavMenu: () => null,
}));
jest.mock("~/layouts/MainLayout/HeaderMenu/MobileNavDrawer", () => ({
  MobileNavDrawer: () => null,
}));
jest.mock("~/layouts/MainLayout/HeaderMenu/HeaderSearchButton", () => ({
  HeaderSearchButton: () => null,
}));

const { activeGroupName } =
  require("~/layouts/MainLayout/HeaderMenu/HeaderMenu") as typeof HeaderMenuModule;

describe("activeGroupName", () => {
  it("gives the public freelance board and its jobs to Universe", () => {
    expect(activeGroupName("/freelance")).toBe("Universe");
    expect(
      activeGroupName("/freelance/3868eaed-8278-4cb7-9709-7d7de9c20dc7"),
    ).toBe("Universe");
  });

  it("gives the personal freelance list to Character", () => {
    expect(activeGroupName("/freelance/mine")).toBe("Character");
  });

  it("still matches an app by its first segment", () => {
    // Assets is configured as /assets/character.
    expect(activeGroupName("/assets/corporation")).toBe("Character");
    expect(activeGroupName("/")).toBeNull();
  });
});
