/**
 * @jest-environment node
 */
import type { ReactElement } from "react";
import { describe, expect, it, jest } from "@jest/globals";

import type * as JobRoute from "~/app/freelance/[jobId]/page";
import type * as MineRoute from "~/app/freelance/mine/page";
import type * as BoardRoute from "~/app/freelance/page";
import { isCrawlable } from "~/config/seo";

// The three freelance routes' server halves: what they tell crawlers and how
// the job route treats its segment. The pages themselves are client-rendered
// and covered by the freelance*Page tests.

const mockJobPage = () => null;
jest.mock("~/app/freelance/[jobId]/page.client", () => ({
  __esModule: true,
  default: mockJobPage,
}));
jest.mock("~/app/freelance/page.client", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("~/app/freelance/mine/page.client", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("~/components/PageSkeleton", () => ({ PageSkeleton: () => null }));
jest.mock("nuqs/adapters/react", () => ({
  NuqsAdapter: ({ children }: { children: unknown }) => children,
}));

const board = require("~/app/freelance/page") as typeof BoardRoute;
const mine = require("~/app/freelance/mine/page") as typeof MineRoute;
const job = require("~/app/freelance/[jobId]/page") as typeof JobRoute;

const JOB_ID = "3868eaed-8278-4cb7-9709-7d7de9c20dc7";
const params = (jobId: string) => ({ params: Promise.resolve({ jobId }) });

/** Render the route's Suspense child, the async part that reads the params. */
async function renderContent(jobId: string) {
  const tree = job.default(params(jobId)) as ReactElement<{
    children: ReactElement;
  }>;
  const child = tree.props.children;
  return (child.type as (p: unknown) => Promise<ReactElement>)(child.props);
}

describe("freelance routes", () => {
  it("describe the board and the personal list for unfurls", () => {
    expect(board.metadata.title).toBe("Freelance Jobs");
    expect(board.metadata.alternates?.canonical).toBe("/freelance");
    expect(mine.metadata.alternates?.canonical).toBe("/freelance/mine");
  });

  it("let crawlers index the board and jobs, but not the personal list", () => {
    expect(isCrawlable("/freelance")).toBe(true);
    expect(isCrawlable(`/freelance/${JOB_ID}`)).toBe(true);
    expect(isCrawlable("/freelance/mine")).toBe(false);
  });

  it("gives a job a canonical URL of its own", async () => {
    const meta = await job.generateMetadata(params(JOB_ID));
    expect(meta.title).toBe("Freelance Job");
    expect(meta.alternates?.canonical).toBe(`/freelance/${JOB_ID}`);
  });

  it("returns no metadata for a segment that is not a job id", async () => {
    expect(await job.generateMetadata(params(JOB_ID.toUpperCase()))).toEqual(
      {},
    );
    expect(await job.generateMetadata(params("nonsense"))).toEqual({});
  });

  it("hands a valid id to the client page", async () => {
    const content = (await renderContent(JOB_ID)) as ReactElement<{
      children: ReactElement<{ jobId: string }>;
    }>;
    expect(content.props.children.type).toBe(mockJobPage);
    expect(content.props.children.props.jobId).toBe(JOB_ID);
  });

  it("404s a segment that is not a job id, before any fetch", async () => {
    await expect(renderContent("nonsense")).rejects.toThrow();
  });

  it("prerenders only a placeholder the page refuses", () => {
    expect(job.generateStaticParams()).toEqual([{ jobId: "0" }]);
  });
});
