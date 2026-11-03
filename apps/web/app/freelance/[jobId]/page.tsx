import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/react";

import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata } from "~/lib/metadata";
import { parseFreelanceJobId } from "~/lib/routeParams";
import FreelanceJobPage from "./page.client";

// No ESI read on the server: the job is fetched in the browser, so the page is
// the same shell for every job and a job's metadata is generic.
export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ jobId: string }>;
}>): Promise<Metadata> {
  const jobId = parseFreelanceJobId((await params).jobId);
  if (jobId === null) return {};
  return pageMetadata({
    title: "Freelance Job",
    description:
      "An EVE Online freelance job: what it asks for, where, how far along it is and how much ISK is left to earn.",
    path: `/freelance/${jobId}`,
    badge: "Freelance Jobs",
  });
}

// One cached shell per job instead of a render per request: without
// `generateStaticParams` an unlisted id re-renders on every request (see
// apps/web/CLAUDE.md → "ISR for a dynamic `[param]` route"). Cache Components
// rejects an empty list, and the real ids are ESI's, so this lists one id
// `parseFreelanceJobId` refuses, which prerenders as a 404.
export function generateStaticParams() {
  return [{ jobId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ jobId: string }>;
}>) {
  const jobId = parseFreelanceJobId((await params).jobId);
  if (jobId === null) notFound();
  // nuqs's React adapter: the app-wide Next adapter reads useSearchParams(),
  // which would drop this subtree out of the cached shell (apps/web/CLAUDE.md).
  return (
    <NuqsAdapter>
      <FreelanceJobPage jobId={jobId} />
    </NuqsAdapter>
  );
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ jobId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton size="lg" />}>
      <PageContent params={params} />
    </Suspense>
  );
}
