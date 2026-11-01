import "@testing-library/jest-dom/jest-globals";

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { withNuqsTestingAdapter } from "nuqs/adapters/testing";

const hooks = {
  characterIds: jest.fn(),
  characters: jest.fn(),
  corporations: jest.fn(),
  subjects: jest.fn(),
};
const mockOpenContextModal = jest.fn();

jest.mock("@jitaspace/hooks", () => ({
  CORPORATION_FREELANCE_JOBS_SCOPE: "esi-corporations.read_freelance_jobs.v1",
  FREELANCE_JOB_MANAGER_ROLES: ["Project_Manager"],
  useAuthenticatedCharacterIds: () => hooks.characterIds(),
  useCharactersFreelanceJobs: () => hooks.characters(),
  useCorporationsFreelanceJobs: () => hooks.corporations(),
  useEsiSubjects: () => hooks.subjects(),
}));
jest.mock("@mantine/modals", () => ({
  openContextModal: (...args: unknown[]) => mockOpenContextModal(...args),
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

const CHARACTER = 90000001;
const OTHER_CHARACTER = 90000002;
const CORPORATION = 98000001;
const MANAGER = 90000003;

const SHARED_JOB = "3868eaed-8278-4cb7-9709-7d7de9c20dc7";
const CORP_JOB = "9c6af0a9-f78b-4e65-beda-ae498045449c";

const job = (
  id: string,
  name: string,
  subjectId: number,
  state = "Active",
) => ({
  id,
  name,
  state,
  last_modified: "2026-10-30T00:00:00Z",
  progress: { current: 1, desired: 10 },
  reward: { initial: 100, remaining: 90 },
  subjectId,
});

const envelope = (
  data: unknown[],
  subjectIds: number[],
  over: Record<string, unknown> = {},
) => ({
  data,
  subjectIds,
  errors: [],
  isLoading: false,
  isPending: false,
  isError: false,
  pendingSubjectIds: [],
  refetch: () => undefined,
  ...over,
});

function renderPage(searchParams = "") {
  const Page = require("~/app/freelance/mine/page.client").default;
  return render(
    <MantineProvider>
      <Page />
    </MantineProvider>,
    { wrapper: withNuqsTestingAdapter({ searchParams, hasMemory: true }) },
  );
}

const container = () => document.body;

const bodyRows = () =>
  screen.getAllByRole("row").filter((row) => row.querySelector("td"));

/** Two characters sharing a job, and a corporation that posted another. */
function withEverySource() {
  hooks.characterIds.mockReturnValue([CHARACTER, OTHER_CHARACTER, MANAGER]);
  hooks.characters.mockReturnValue(
    envelope(
      [
        job(SHARED_JOB, "Shared job", CHARACTER),
        job(SHARED_JOB, "Shared job", OTHER_CHARACTER),
      ],
      [CHARACTER, OTHER_CHARACTER],
    ),
  );
  hooks.corporations.mockReturnValue(
    envelope(
      [job(CORP_JOB, "Corp job", CORPORATION, "Completed")],
      [CORPORATION],
    ),
  );
  hooks.subjects.mockReturnValue([
    { id: CORPORATION, characterId: MANAGER, authHeaders: {} },
  ]);
}

describe("Your freelance jobs", () => {
  beforeEach(() => {
    for (const hook of Object.values(hooks)) hook.mockReset();
    mockOpenContextModal.mockReset();
    hooks.characterIds.mockReturnValue([]);
    hooks.characters.mockReturnValue(envelope([], []));
    hooks.corporations.mockReturnValue(envelope([], []));
    hooks.subjects.mockReturnValue([]);
  });

  it("lists a job once however many sources share it", () => {
    withEverySource();
    renderPage();

    expect(bodyRows()).toHaveLength(2);
    expect(
      screen.getByRole("columnheader", { name: /State/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Listed by/ }),
    ).toBeInTheDocument();
  });

  it("opens each job as the character that can see it", () => {
    withEverySource();
    renderPage();

    expect(screen.getByRole("link", { name: "Shared job" })).toHaveAttribute(
      "href",
      `/freelance/${SHARED_JOB}?as=${CHARACTER}`,
    );
    // A corporation's job opens as the manager whose token reads it.
    expect(screen.getByRole("link", { name: "Corp job" })).toHaveAttribute(
      "href",
      `/freelance/${CORP_JOB}?as=${MANAGER}`,
    );
  });

  it("narrows to the sources named in the URL", () => {
    withEverySource();
    renderPage(`?sources=corporation:${CORPORATION}`);

    const rows = bodyRows();
    expect(rows).toHaveLength(1);
    expect(within(rows[0]!).getByText("Corp job")).toBeInTheDocument();
  });

  it("filters by chip, and says so when nothing is selected", async () => {
    withEverySource();
    renderPage(`?sources=corporation:${CORPORATION}`);

    await userEvent.click(
      screen.getByRole("checkbox", { name: `entity-${CORPORATION}` }),
    );

    expect(
      screen.getByText("No sources selected. Pick one above to see its jobs."),
    ).toBeInTheDocument();
  });

  it("asks a visitor who is not signed in to sign in", async () => {
    renderPage();

    expect(
      screen.getByText(/Sign in with EVE Online to see your characters/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(mockOpenContextModal).toHaveBeenCalledWith(
      expect.objectContaining({
        modal: "login",
        innerProps: {
          scopes: expect.arrayContaining([
            "esi-characters.read_freelance_jobs.v1",
            "esi-corporations.read_freelance_jobs.v1",
            "esi-characters.read_corporation_roles.v1",
          ]),
        },
      }),
    );
  });

  it("asks for the scopes when no character granted them", () => {
    hooks.characterIds.mockReturnValue([CHARACTER]);
    renderPage();

    expect(
      screen.getByText(/None of your characters have granted access/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Grant access" }),
    ).toBeInTheDocument();
  });

  it("shows skeleton rows, not an empty state, while loading", () => {
    hooks.characterIds.mockReturnValue([CHARACTER]);
    hooks.characters.mockReturnValue(
      envelope([], [CHARACTER], {
        isPending: true,
        pendingSubjectIds: [CHARACTER],
      }),
    );
    const { container } = renderPage();

    expect(
      container.querySelectorAll("tr[data-skeleton]").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Grant access" })).toBeNull();
  });

  it("says it is loading until the session is known, not that access is missing", () => {
    hooks.characters.mockReturnValue(envelope([], [], { isPending: true }));
    renderPage();

    expect(screen.getByText("Loading your characters…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
    expect(
      container().querySelectorAll("tr[data-skeleton]").length,
    ).toBeGreaterThan(0);
  });

  it("names the only source instead of offering chips", () => {
    hooks.characterIds.mockReturnValue([CHARACTER]);
    hooks.characters.mockReturnValue(
      envelope([job(SHARED_JOB, "Shared job", CHARACTER)], [CHARACTER]),
    );
    renderPage();

    expect(screen.getByText("Jobs of")).toBeInTheDocument();
    expect(screen.getByText(`entity-${CHARACTER}`)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(
      screen.queryByRole("columnheader", { name: /Listed by/ }),
    ).toBeNull();
  });

  it("reports a source that failed and keeps the others", () => {
    withEverySource();
    hooks.corporations.mockReturnValue(
      envelope([], [CORPORATION], {
        isError: true,
        errors: [{ subjectId: CORPORATION, error: new Error("Forbidden") }],
      }),
    );
    renderPage();

    expect(
      screen.getByText("Some jobs could not be loaded"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Forbidden/)).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(1);
    // The failing source is flagged on its own chip too.
    expect(
      screen.getByRole("checkbox", {
        name: `entity-${CORPORATION} (could not be loaded)`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: `entity-${CHARACTER}` }),
    ).toBeInTheDocument();
  });
});
