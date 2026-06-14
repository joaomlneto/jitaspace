import { Suspense } from "react";
import { Loader } from "@mantine/core";

import BuildHistoryClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ build: string }>;
}) {
  const { build } = await params;
  return {
    title: `Build ${build} — Change History`,
    description: `Everything that changed in EVE Online client build ${build}.`,
  };
}

async function PageContent({
  params,
}: {
  params: Promise<{ build: string }>;
}) {
  const { build } = await params;
  return <BuildHistoryClient build={Number(build)} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ build: string }>;
}) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
