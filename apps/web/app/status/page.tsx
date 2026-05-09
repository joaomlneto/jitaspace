import { Suspense } from "react";
import { Loader } from "@mantine/core";

import type { SdeLastModifiedResponse, VercelStatusResponse } from "./types";
import StatusPageClient from "./page.client";

async function getVercelStatus() {
  "use server";

  return await fetch("https://www.vercel-status.com/api/v2/status.json", {
    next: { revalidate: 60 },
  }).then((res) => res.json() as Promise<VercelStatusResponse>);
}

async function getSdeLastModified() {
  "use server";

  return await fetch(
    "https://developers.eveonline.com/static-data/tranquility/latest.jsonl",
    {
      next: { revalidate: 60 },
    },
  ).then((res) => res.json() as Promise<SdeLastModifiedResponse>);
}

async function StatusPageContent() {
  const vercelStatusData = await getVercelStatus().catch(() => null);
  const sdeLastModifiedData = await getSdeLastModified().catch(() => null);

  return (
    <StatusPageClient
      vercelStatusData={vercelStatusData}
      sdeLastModifiedData={sdeLastModifiedData}
    />
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={<Loader />}>
      <StatusPageContent />
    </Suspense>
  );
}
