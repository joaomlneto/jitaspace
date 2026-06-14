import { Suspense } from "react";
import { Loader } from "@mantine/core";

import BuildHistoryClient from "./page.client";

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
