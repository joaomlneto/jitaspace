import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader } from "@mantine/core";

import PageClient from "./page.client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ killId: string }>;
}): Promise<Metadata> {
  const { killId } = await params;
  const id = Number(killId);
  if (!Number.isSafeInteger(id) || id <= 0) return {};
  return {
    title: `Killmail #${id}`,
    description: `EVE Online killmail #${id} — view kill details, attackers, and loot.`,
  };
}

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <PageClient />
    </Suspense>
  );
}
