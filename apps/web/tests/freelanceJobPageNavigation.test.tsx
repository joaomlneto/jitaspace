import "@testing-library/jest-dom/jest-globals";

import type * as ReactModule from "react";
import { Activity, startTransition, useInsertionEffect } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { MantineProvider } from "@mantine/core";
import { act, render } from "@testing-library/react";
import { NuqsAdapter } from "nuqs/adapters/react";

/**
 * The job page under the real React nuqs adapter, reached the ways Next
 * reaches it. The other job page tests hand it the URL from the first render;
 * here the URL changes as Next changes it, in an insertion effect during the
 * commit, so the page can render with the previous page's query string.
 */

const CHARACTER = 90000001;
const JOB_ID = "3868eaed-8278-4cb7-9709-7d7de9c20dc7";

/** Each read the page committed to: what useQuery would subscribe with. */
const committedReads: { characterId?: number; enabled: boolean }[] = [];

jest.mock("@jitaspace/hooks", () => {
  const React = jest.requireActual<typeof ReactModule>("react");
  return {
    CORPORATION_FREELANCE_JOBS_SCOPE: "esi-corporations.read_freelance_jobs.v1",
    FREELANCE_JOB_MANAGER_ROLES: ["Project_Manager"],
    useAuthStoreHasHydrated: () => true,
    useAuthenticatedCharacterIds: () => [CHARACTER],
    useEsiSubjects: ({ kind }: { kind: string }) =>
      kind === "character"
        ? [{ id: CHARACTER, characterId: CHARACTER, authHeaders: {} }]
        : [],
    // Like useQuery, whose observer subscribes (and fetches) in an effect: a
    // render that never commits never reads.
    useFreelanceJob: (
      _jobId: string,
      options: { characterId?: number; enabled: boolean },
    ) => {
      React.useEffect(() => {
        committedReads.push(options);
      });
      return { data: undefined, error: null };
    },
    useCharactersFreelanceJobs: () => ({ data: [] }),
    useCharactersFreelanceJobParticipation: () => ({ data: [] }),
    useCorporationFreelanceJobParticipants: () => ({}),
    useGroup: () => ({}),
    useStructure: () => ({ data: undefined, isLoading: false }),
  };
});
jest.mock(
  "@jitaspace/eve-icons",
  () => new Proxy({}, { get: () => () => null }),
);
jest.mock("@jitaspace/eve-components", () => ({
  EveEntityAvatar: () => null,
  EveEntityName: () => null,
}));
jest.mock("~/components/EveMail", () => ({ MailMessageViewer: () => null }));

/** Next's HistoryUpdater: the URL changes as the navigation commits. */
function HistoryUpdater({ url }: Readonly<{ url: string }>) {
  useInsertionEffect(() => {
    if (location.pathname + location.search !== url) {
      history.pushState({ __NA: true }, "", url);
    }
  }, [url]);
  return null;
}

function App({
  url,
  page,
}: Readonly<{ url: string; page: "none" | "visible" | "hidden" }>) {
  const Page = require("~/app/freelance/[jobId]/page.client").default;
  return (
    <MantineProvider>
      <NuqsAdapter>
        <HistoryUpdater url={url} />
        {/* How Next keeps a recently visited page: mounted, hidden. */}
        <Activity mode={page === "visible" ? "visible" : "hidden"}>
          {page !== "none" && <Page jobId={JOB_ID} />}
        </Activity>
      </NuqsAdapter>
    </MantineProvider>
  );
}

const navigate = (
  view: ReturnType<typeof render>,
  props: Parameters<typeof App>[0],
) =>
  act(() => {
    startTransition(() => view.rerender(<App {...props} />));
  });

/** Reads that would reach ESI, i.e. committed while enabled. */
const enabledReads = () => committedReads.filter((read) => read.enabled);

describe("Freelance job page navigation", () => {
  beforeEach(() => {
    committedReads.length = 0;
  });

  it("reads as the ?as= character after a client-side navigation, never anonymously first", () => {
    history.replaceState(null, "", "/freelance/mine?sources=x");
    const view = render(<App url="/freelance/mine?sources=x" page="none" />);

    navigate(view, {
      url: `/freelance/${JOB_ID}?as=${CHARACTER}`,
      page: "visible",
    });

    expect(enabledReads()).toEqual([{ characterId: CHARACTER, enabled: true }]);
    view.unmount();
  });

  it("does the same when Next shows a page it kept hidden", () => {
    // First visit without ?as=: an anonymous read, as it should be.
    history.replaceState(null, "", `/freelance/${JOB_ID}`);
    const view = render(<App url={`/freelance/${JOB_ID}`} page="visible" />);
    navigate(view, { url: "/freelance/mine", page: "hidden" });
    committedReads.length = 0;

    // Back to the same job from "Your jobs", now with ?as=. Next re-shows the
    // kept page, which renders once with the old URL before Next pushes it.
    navigate(view, {
      url: `/freelance/${JOB_ID}?as=${CHARACTER}`,
      page: "visible",
    });

    expect(enabledReads()).toEqual([{ characterId: CHARACTER, enabled: true }]);
    view.unmount();
  });
});
