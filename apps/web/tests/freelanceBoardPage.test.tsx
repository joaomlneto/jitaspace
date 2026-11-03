import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUseFreelanceJobs = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  useFreelanceJobs: () => mockUseFreelanceJobs(),
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);

const job = (id: string, name: string, remaining: number) => ({
  id,
  name,
  state: "Active",
  last_modified: "2026-10-30T00:00:00Z",
  progress: { current: remaining > 0 ? 25 : 0, desired: 100 },
  reward: { initial: 2_000_000, remaining },
});

const JOBS = [
  job("3868eaed-8278-4cb7-9709-7d7de9c20dc7", "Haul tritanium", 1_500_000),
  job("9c6af0a9-f78b-4e65-beda-ae498045449c", "Mine veldspar", 0),
];

const result = (over: Record<string, unknown> = {}) => ({
  data: undefined,
  isPending: false,
  isError: false,
  error: null,
  isRefetching: false,
  refetch: jest.fn(),
  ...over,
});

function renderPage() {
  const Page = require("~/app/freelance/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
  );
}

const bodyRows = () =>
  screen.getAllByRole("row").filter((row) => row.querySelector("td"));

describe("Freelance job board", () => {
  beforeEach(() => {
    mockUseFreelanceJobs.mockReset();
  });

  it("holds the table's height with skeleton rows while loading", () => {
    mockUseFreelanceJobs.mockReturnValue(result({ isPending: true }));
    const { container } = renderPage();

    expect(
      container.querySelectorAll("tr[data-skeleton]").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", { level: 1, name: "Freelance Jobs" }),
    ).toBeInTheDocument();
  });

  it("lists every job, linked to its page, richest first", () => {
    mockUseFreelanceJobs.mockReturnValue(result({ data: JOBS }));
    renderPage();

    const rows = bodyRows();
    expect(rows).toHaveLength(2);
    const first = within(rows[0]!).getByRole("link", {
      name: "Haul tritanium",
    });
    expect(first).toHaveAttribute(
      "href",
      "/freelance/3868eaed-8278-4cb7-9709-7d7de9c20dc7",
    );
    // The public board is active jobs only, so it has no State column.
    expect(
      screen.queryByRole("columnheader", { name: /State/ }),
    ).not.toBeInTheDocument();
  });

  it("gives each progress bar an accessible name with its figures", () => {
    mockUseFreelanceJobs.mockReturnValue(result({ data: JOBS }));
    renderPage();

    expect(
      screen.getByRole("progressbar", {
        name: "Haul tritanium: 25 of 100 (25%)",
      }),
    ).toBeInTheDocument();
  });

  it("reads a job without a reward as 'No reward', not a dash", () => {
    const { reward: _reward, ...unpaid } = job(
      "5d0c5c33-8e0a-4a39-8b3e-2a8f1f2b6c11",
      "Volunteer patrol",
      0,
    );
    mockUseFreelanceJobs.mockReturnValue(result({ data: [unpaid] }));
    renderPage();

    const row = screen.getByRole("row", { name: /Volunteer patrol/ });
    expect(row).toHaveTextContent("No reward");
    expect(row.querySelector('[aria-label="No reward"]')).toBeNull();
  });

  it("summarises the board", () => {
    mockUseFreelanceJobs.mockReturnValue(result({ data: JOBS }));
    renderPage();

    const stat = (name: string) => screen.getByRole("group", { name });
    expect(stat("ISK left to earn")).toHaveTextContent("1.5M ISK");
    // Two active jobs, one of them under way.
    expect(stat("Active jobs")).toHaveTextContent("2");
    expect(stat("Jobs under way")).toHaveTextContent("1");
  });

  it("reports a failed load and retries on request", async () => {
    const refetch = jest.fn();
    mockUseFreelanceJobs.mockReturnValue(
      result({ isError: true, error: new Error("ESI is down"), refetch }),
    );
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("ESI is down");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
    expect(screen.getByText("No jobs to show")).toBeInTheDocument();
  });

  it("says so when the board is empty", () => {
    mockUseFreelanceJobs.mockReturnValue(result({ data: [] }));
    renderPage();

    expect(
      screen.getByText("There are no public freelance jobs right now"),
    ).toBeInTheDocument();
  });
});
