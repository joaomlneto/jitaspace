import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ warId: string }>;
}): Promise<Metadata> {
  const { warId } = await params;
  const id = Number(warId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  return {
    title: `War #${id}`,
    description: `EVE Online war #${id} — view war details, mutual war status, and open kills.`,
  };
}

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <PageClient />
    </Suspense>
  );
}
