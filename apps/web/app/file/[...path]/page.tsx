import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader } from "@mantine/core";

import { pageMetadata } from "~/lib/metadata";
import { filePageHref, parseFilePathSegments } from "~/lib/resource-pages";
import { getCachedFileHistory } from "./data";
import FileHistoryPage from "./page.client";

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ path: string[] }>;
}>): Promise<Metadata> {
  const { path: segments } = await params;
  const path = parseFilePathSegments(segments);
  if (path === null) return {};
  return pageMetadata({
    title: `${path.split("/").at(-1) ?? path} — File History`,
    description: `Size, hash and change history of the EVE Online client file ${path}, build by build.`,
    path: filePageHref(path),
    badge: "Change History",
  });
}

// ISR, as for /history/build/[build]: the history DB is unreachable at build
// time, so the only prerendered param is one the page 404s before querying.
export function generateStaticParams() {
  return [{ path: ["_"] }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ path: string[] }>;
}>) {
  const { path: segments } = await params;
  const path = parseFilePathSegments(segments);
  if (path === null) notFound();
  const history = await getCachedFileHistory(path);
  if (history === null) notFound();
  return <FileHistoryPage history={history} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ path: string[] }>;
}>) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
