import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import type { ESIScope } from "@jitaspace/esi-metadata";

import { ScopesTable } from "~/components/ScopeGuard/ScopesTable";

jest.mock("@jitaspace/esi-metadata", () => ({
  getScopeDescription: () => "Scope description",
}));

describe("ScopesTable", () => {
  it("does not crash when scopes is not an array at runtime", () => {
    const invalidScopes = "esi-skills.read_skills.v1" as unknown as ESIScope[];

    expect(() => {
      render(
        <MantineProvider>
          <ScopesTable scopes={invalidScopes} />
        </MantineProvider>,
      );
    }).not.toThrow();

    expect(screen.queryByText("Scope description")).not.toBeInTheDocument();
  });

  it("sorts scopes for rendering without mutating the original input array", () => {
    const scopes: ESIScope[] = [
      "esi-skills.read_skills.v1",
      "esi-skills.read_skillqueue.v1",
    ];

    render(
      <MantineProvider>
        <ScopesTable scopes={scopes} showRawScopeNames />
      </MantineProvider>,
    );

    const renderedScopeOrder = screen
      .getAllByText(/^esi-skills\.read_/)
      .map((element) => element.textContent);

    expect(renderedScopeOrder).toEqual([
      "esi-skills.read_skillqueue.v1",
      "esi-skills.read_skills.v1",
    ]);
    expect(scopes).toEqual([
      "esi-skills.read_skills.v1",
      "esi-skills.read_skillqueue.v1",
    ]);
  });

  it("splits both ESI scope naming conventions into category and permission badges", () => {
    render(
      <MantineProvider>
        <ScopesTable
          scopes={["esi-characters.read_contacts.v1", "esi.cosmetic.char:read"]}
        />
      </MantineProvider>,
    );

    const badgesInRowOf = (text: string) =>
      Array.from(
        screen
          .getByText(text)
          .closest("tr")
          ?.querySelectorAll(".mantine-Badge-root") ?? [],
      ).map((badge) => badge.textContent.trim());

    // Legacy `esi-{domain}.{action}.v{N}`: unchanged behaviour.
    expect(badgesInRowOf("read contacts")).toEqual([
      "characters",
      "read contacts",
    ]);
    // `esi.{domain}.{subject}:{action}` used to yield an empty category and
    // "cosmetic" as the permission.
    expect(badgesInRowOf("read char")).toEqual(["cosmetic", "read char"]);
  });
});
