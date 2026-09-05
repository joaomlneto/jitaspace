import { Suspense } from "react";
import { Loader } from "@mantine/core";

import { getCachedBuildSummary } from "~/lib/history-cache";
import BuildHistoryClient from "./page.client";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ build: string }>;
}>) {
  const { build } = await params;
  // What search results and link previews show. The generated sentence says what
  // this build actually changed; without one, the generic line still describes
  // the page correctly.
  let summary: string | null = null;
  try {
    summary = await getCachedBuildSummary(Number(build));
  } catch {
    summary = null;
  }
  return {
    title: `Build ${build} — Change History`,
    description:
      summary ?? `Everything that changed in EVE Online client build ${build}.`,
  };
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ build: string }>;
}>) {
  const { build } = await params;
  return <BuildHistoryClient build={Number(build)} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ build: string }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
