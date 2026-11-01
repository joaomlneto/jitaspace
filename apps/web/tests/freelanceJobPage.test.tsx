import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

const hooks = {
  hydrated: jest.fn(),
  characterIds: jest.fn(),
  job: jest.fn(),
  listings: jest.fn(),
  participation: jest.fn(),
  participants: jest.fn(),
  subjects: jest.fn(),
  group: jest.fn(),
};

jest.mock("@jitaspace/hooks", () => ({
  CORPORATION_FREELANCE_JOBS_SCOPE: "esi-corporations.read_freelance_jobs.v1",
  FREELANCE_JOB_MANAGER_ROLES: ["Project_Manager"],
  useAuthStoreHasHydrated: () => hooks.hydrated(),
  useAuthenticatedCharacterIds: () => hooks.characterIds(),
  useFreelanceJob: (...args: unknown[]) => hooks.job(...args),
  useCharactersFreelanceJobs: () => hooks.listings(),
  useCharactersFreelanceJobParticipation: (...args: unknown[]) =>
    hooks.participation(...args),
  useCorporationFreelanceJobParticipants: (...args: unknown[]) =>
    hooks.participants(...args),
  useEsiSubjects: () => hooks.subjects(),
  useGroup: (...args: unknown[]) => hooks.group(...args),
  // No character here can dock at the structure, so its name stays unread.
  useStructure: () => ({ data: undefined, isLoading: false }),
}));
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("@jitaspace/eve-components", () => ({
  EveEntityAvatar: () => null,
  EveEntityName: ({ entityId }: { entityId?: number }) => (
    <span>{`entity-${entityId}`}</span>
  ),
}));
jest.mock("~/components/EveMail", () => ({
  MailMessageViewer: ({ content }: { content: string }) => (
    <div data-testid="description">{content}</div>
  ),
}));

const JOB_ID = "3868eaed-8278-4cb7-9709-7d7de9c20dc7";
const CHARACTER = 90000001;
const OTHER_CHARACTER = 90000002;
const CREATOR_CORPORATION = 98000001;

const details = (over: Record<string, unknown> = {}) => ({
  id: JOB_ID,
  name: "Haul ore to Jita",
  state: "Active",
  last_modified: "2026-10-30T00:00:00Z",
  progress: { current: 40, desired: 100 },
  reward: { initial: 1_000_000, remaining: 600_000 },
  details: {
    description: "<b>Bring ore</b>",
    career: "Industrialist",
    created: "2026-10-01T00:00:00Z",
    expires: "2026-12-01T00:00:00Z",
    creator: {
      character: { id: 2119957354, name: "Chaos Magus" },
      corporation: { id: CREATOR_CORPORATION, name: "Stardust Journey" },
    },
  },
  configuration: {
    method: "DeliverItem",
    version: 1,
    parameters: {
      corporation_item_delivery: {
        corporation_item_delivery: {
          item_type: {
            values: [
              { value_type: "item_type", values: ["34"] },
              { value_type: "item_group", values: ["18"] },
            ],
          },
          corporation_office_location: {
            values: [
              { value_type: "station", values: ["60003760"] },
              { value_type: "structure", values: ["1035466617946"] },
            ],
          },
        },
      },
      require_capsuleer_involvement: { boolean: { value: false } },
    },
  },
  contribution: {
    max_committed_participants: 10000,
    reward_per_contribution: 10000,
    submission_multiplier: 1,
    contribution_per_participant_limit: 50,
  },
  access_and_visibility: {
    acl_protected: false,
    broadcast_locations: [{ id: 30000142, name: "Jita" }],
    restrictions: { minimum_age: 30 },
  },
  ...over,
});

const envelope = (data: unknown[], subjectIds: number[] = []) => ({
  data,
  subjectIds,
  errors: [],
  isLoading: false,
  isPending: false,
  isError: false,
  pendingSubjectIds: [],
  refetch: () => undefined,
});

const axiosError = (status: number) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status },
  });

function renderPage(searchParams = "") {
  const Page = require("~/app/freelance/[jobId]/page.client").default;
  return render(
    <MantineProvider>
      <Page jobId={JOB_ID} />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams, hasMemory: true }) },
  );
}

describe("Freelance job page", () => {
  beforeEach(() => {
    for (const hook of Object.values(hooks)) hook.mockReset();
    hooks.hydrated.mockReturnValue(true);
    hooks.characterIds.mockReturnValue([]);
    hooks.job.mockReturnValue({ data: details(), error: null });
    hooks.listings.mockReturnValue(envelope([]));
    hooks.participation.mockReturnValue(envelope([]));
    hooks.participants.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
    });
    hooks.subjects.mockReturnValue([]);
    hooks.group.mockReturnValue({ data: { data: { name: "Mineral" } } });
  });

  it("shows what the job is and who posted it", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Haul ore to Jita" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Industrialist")).toBeInTheDocument();
    expect(screen.getAllByText("Deliver items").length).toBeGreaterThan(0);
    expect(screen.getByTestId("description")).toHaveTextContent(
      "<b>Bring ore</b>",
    );
    expect(screen.getByRole("link", { name: "Chaos Magus" })).toHaveAttribute(
      "href",
      "/character/2119957354",
    );
    expect(screen.getByRole("link", { name: "Jita" })).toHaveAttribute(
      "href",
      "/system/30000142",
    );
    expect(
      screen.getByRole("link", { name: /Freelance jobs/ }),
    ).toHaveAttribute("href", "/freelance");
  });

  it("names every item and drop-off the job asks for", () => {
    renderPage();

    expect(screen.getByText("entity-34")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mineral" })).toHaveAttribute(
      "href",
      "/group/18",
    );
    expect(screen.getByText("entity-60003760")).toBeInTheDocument();
    expect(screen.getByText("Structure 1035466617946")).toBeInTheDocument();
    expect(
      screen.getByText("Requires capsuleer involvement"),
    ).toBeInTheDocument();
  });

  it("states the rules and restrictions", () => {
    renderPage();

    expect(screen.getByText("10,000 ISK")).toBeInTheDocument();
    expect(screen.getByText("30 days")).toBeInTheDocument();
    expect(screen.getByText("Anyone")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("reads anonymously without ?as=", () => {
    renderPage();
    expect(hooks.job).toHaveBeenCalledWith(JOB_ID, { characterId: undefined });
  });

  it("reads as the ?as= character once it is known to be logged in", () => {
    hooks.characterIds.mockReturnValue([CHARACTER]);
    renderPage(`?as=${CHARACTER}`);
    expect(hooks.job).toHaveBeenLastCalledWith(JOB_ID, {
      characterId: CHARACTER,
    });
  });

  it("keeps ?as= while the auth store rehydrates, and drops a stranger after", () => {
    hooks.hydrated.mockReturnValue(false);
    const { unmount } = renderPage(`?as=${CHARACTER}`);
    expect(hooks.job).toHaveBeenLastCalledWith(JOB_ID, {
      characterId: CHARACTER,
    });
    unmount();

    hooks.hydrated.mockReturnValue(true);
    renderPage(`?as=${CHARACTER}`);
    expect(hooks.job).toHaveBeenLastCalledWith(JOB_ID, {
      characterId: undefined,
    });
  });

  it("offers to read a job hidden from anonymous visitors as a character", async () => {
    hooks.characterIds.mockReturnValue([CHARACTER, OTHER_CHARACTER]);
    hooks.job.mockImplementation((_id, options) =>
      (options as { characterId?: number }).characterId === OTHER_CHARACTER
        ? { data: details({ name: "Private haul" }), error: null }
        : { data: undefined, error: axiosError(404) },
    );
    renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("Job not found");
    await userEvent.click(
      screen.getByRole("button", { name: `entity-${OTHER_CHARACTER}` }),
    );

    expect(
      await screen.findByRole("heading", { name: "Private haul" }),
    ).toBeInTheDocument();
  });

  it("does not blame access for an ESI outage", () => {
    hooks.job.mockReturnValue({ data: undefined, error: axiosError(502) });
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This job could not be loaded",
    );
  });

  it("shows a skeleton while the job loads", () => {
    hooks.job.mockReturnValue({ data: undefined, error: null });
    renderPage();
    expect(screen.getByLabelText("Loading freelance job")).toBeInTheDocument();
  });

  it("shows each participating character's contribution", () => {
    hooks.listings.mockReturnValue(
      envelope(
        [
          { id: JOB_ID, subjectId: CHARACTER },
          { id: "other", subjectId: OTHER_CHARACTER },
        ],
        [CHARACTER, OTHER_CHARACTER],
      ),
    );
    hooks.participation.mockReturnValue(
      envelope([
        {
          subjectId: CHARACTER,
          data: { state: "Committed", contributed: 10, last_modified: "x" },
        },
      ]),
    );
    renderPage();

    // Only the character whose listing holds the job is asked about it.
    expect(hooks.participation).toHaveBeenCalledWith(JOB_ID, [CHARACTER]);
    expect(
      screen.getByRole("heading", { name: "Your participation" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Committed")).toBeInTheDocument();
    expect(screen.getByText("10 contributed (25.0%)")).toBeInTheDocument();
  });

  it("lists the participants for a manager of the creator corporation", () => {
    hooks.subjects.mockReturnValue([
      { id: CREATOR_CORPORATION, characterId: CHARACTER, authHeaders: {} },
    ]);
    hooks.participants.mockReturnValue({
      data: [
        { id: 95000001, name: "Ore Hauler", state: "Kicked", contributed: 20 },
      ],
      isPending: false,
      isError: false,
      error: null,
    });
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Participants" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ore Hauler" })).toHaveAttribute(
      "href",
      "/character/95000001",
    );
    expect(screen.getByText("Kicked")).toBeInTheDocument();
    expect(screen.getByText("50.0%")).toBeInTheDocument();
    expect(hooks.participants).toHaveBeenCalledWith(
      CREATOR_CORPORATION,
      JOB_ID,
    );
  });

  it("says why the participants are missing when they fail to load", () => {
    hooks.subjects.mockReturnValue([
      { id: CREATOR_CORPORATION, characterId: CHARACTER, authHeaders: {} },
    ]);
    hooks.participants.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Forbidden"),
    });
    renderPage();

    expect(
      screen.getByText("The participants could not be loaded: Forbidden"),
    ).toBeInTheDocument();
  });

  it("goes back to the anonymous read when the ?as= character cannot see the job", async () => {
    hooks.characterIds.mockReturnValue([CHARACTER]);
    hooks.job.mockImplementation((_id, options) =>
      (options as { characterId?: number }).characterId === CHARACTER
        ? { data: undefined, error: axiosError(403) }
        : { data: details({ name: "Public haul" }), error: null },
    );
    renderPage(`?as=${CHARACTER}`);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "this character cannot see it",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "View the public listing instead" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Public haul" }),
    ).toBeInTheDocument();
  });

  it("hides the participants from everyone else", () => {
    renderPage();
    expect(
      screen.queryByRole("heading", { name: "Participants" }),
    ).not.toBeInTheDocument();
    expect(hooks.participants).not.toHaveBeenCalled();
  });
});
