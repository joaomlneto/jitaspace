import { Suspense } from "react";
import { Loader } from "@mantine/core";

import PageClient from "./page.client";

export default function Page({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  return (
    <Suspense fallback={<Loader />}>
      <PageClient params={params} />
    </Suspense>
  );
}
