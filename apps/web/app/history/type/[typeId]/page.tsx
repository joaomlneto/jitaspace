import { Suspense } from "react";
import { Loader } from "@mantine/core";

import TypeHistoryClient from "./page.client";

async function PageContent({
  params,
}: {
  params: Promise<{ typeId: string }>;
}) {
  const { typeId } = await params;
  return <TypeHistoryClient typeId={Number(typeId)} />;
}

export default function Page({
  params,
}: {
  params: Promise<{ typeId: string }>;
}) {
  return (
    <Suspense fallback={<Loader />}>
      <PageContent params={params} />
    </Suspense>
  );
}
