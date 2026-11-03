import "@testing-library/jest-dom/jest-globals";

import { describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";

import type { FreelanceJobDetails } from "@jitaspace/hooks";

import type * as RequirementsModule from "~/components/Freelance/FreelanceJobRequirements";

const mockUseStructure = jest.fn((_structureId: number): unknown => ({
  data: undefined,
  isLoading: false,
}));

jest.mock("@jitaspace/hooks", () => ({
  // Still loading: the group falls back to its id.
  useGroup: () => ({ data: undefined }),
  useStructure: (structureId: number) =>
    mockUseStructure(structureId) as {
      data?: { data: { name: string } };
      isLoading: boolean;
    },
}));
jest.mock("@jitaspace/eve-components", () => ({
  EveEntityAvatar: () => null,
  EveEntityName: ({ entityId }: { entityId?: number }) => (
    <span>{`entity-${entityId}`}</span>
  ),
}));

const { FreelanceJobRequirements } =
  require("~/components/Freelance/FreelanceJobRequirements") as typeof RequirementsModule;

type Configuration = FreelanceJobDetails["configuration"];

const configuration = (
  parameters: Configuration["parameters"],
): Configuration => ({ method: "KillCapsuleer", version: 1, parameters });

function renderRequirements(parameters: Configuration["parameters"]) {
  return render(
    <MantineProvider>
      <FreelanceJobRequirements configuration={configuration(parameters)} />
    </MantineProvider>,
  );
}

/** The `<dd>` that follows a `<dt>` with this label. */
const valueOf = (label: string) =>
  screen.getByText(label, { selector: "dt" }).nextElementSibling as HTMLElement;

describe("FreelanceJobRequirements", () => {
  it("lists each parameter as a term and its value, location last", () => {
    renderRequirements({
      location: {
        matcher: { values: [{ value_type: "region", values: ["10000002"] }] },
      },
      destroyed_identity: {
        matcher: {
          values: [{ value_type: "corporation", values: ["98586140"] }],
        },
      },
    });

    const terms = screen.getAllByRole("term").map((term) => term.textContent);
    expect(terms).toEqual(["Target", "Location"]);
    expect(valueOf("Target")).toHaveTextContent("entity-98586140");
    expect(valueOf("Location")).toHaveTextContent("entity-10000002");
  });

  it("reads an empty matcher as anything", () => {
    renderRequirements({ destroyed_ship: { matcher: { values: [] } } });
    expect(valueOf("Target ship")).toHaveTextContent("Any");
  });

  it("shows kinds with no page here by their id", () => {
    renderRequirements({
      victim_ship: {
        matcher: { values: [{ value_type: "ship_class", values: ["14"] }] },
      },
      ore: {
        matcher: { values: [{ value_type: "ore_group", values: ["1884"] }] },
      },
    });
    expect(valueOf("Insured ship")).toHaveTextContent("Ship class 14");
    expect(screen.getByRole("link", { name: "Group 1884" })).toHaveAttribute(
      "href",
      "/group/1884",
    );
  });

  it("renders options, booleans, open deliveries and unreadable parameters", () => {
    renderRequirements({
      who: { options: { selected: ["self", "corporation"] } },
      cover_implants: { boolean: { value: true } },
      corporation_item_delivery: {
        corporation_item_delivery: {
          item_type: { values: [] },
          corporation_office_location: { values: [] },
        },
      },
      mystery: {},
    });

    expect(valueOf("Who")).toHaveTextContent("selfcorporation");
    expect(valueOf("Covers implants")).toHaveTextContent("Yes");
    expect(valueOf("Delivery")).toHaveTextContent("Any item");
    expect(valueOf("Delivery")).toHaveTextContent("Any corporation office");
    expect(valueOf("Mystery")).toHaveTextContent(
      "Not shown by ESI in a form we can read",
    );
  });

  it("names a delivery structure by id when its name cannot be read", () => {
    const deliverTo = (structureId: string) => ({
      corporation_item_delivery: {
        corporation_item_delivery: {
          item_type: { values: [] },
          corporation_office_location: {
            values: [{ value_type: "structure", values: [structureId] }],
          },
        },
      },
    });

    const { unmount } = renderRequirements(deliverTo("1051452173924"));
    expect(mockUseStructure).toHaveBeenCalledWith(1051452173924);
    expect(valueOf("Delivery")).toHaveTextContent("Structure 1051452173924");
    unmount();

    // A character that can dock there reads the real name.
    mockUseStructure.mockReturnValueOnce({
      data: { data: { name: "Jita - Trade Hub" } },
      isLoading: false,
    });
    renderRequirements(deliverTo("1051452173925"));
    expect(valueOf("Delivery")).toHaveTextContent("Jita - Trade Hub");
  });

  it("shows an id it cannot read as it came, without linking or fetching it", () => {
    renderRequirements({
      destroyed_identity: {
        matcher: {
          values: [{ value_type: "character", values: ["not-an-id"] }],
        },
      },
    });

    expect(valueOf("Target")).toHaveTextContent("not-an-id");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText(/entity-NaN/)).toBeNull();
  });

  it("says so when a job sets no conditions", () => {
    renderRequirements({});
    expect(
      screen.getByText("This job sets no conditions."),
    ).toBeInTheDocument();
  });
});
