import { pageMetadata } from "~/lib/metadata";
import { readIncursionRats, readIncursionsData } from "./data";
import IncursionsPage from "./page.client";

export const metadata = pageMetadata({
  title: "Incursions",
  description:
    "Live and past Sansha's Nation incursions in EVE Online — influence, timers, site systems, spawn history and Sansha NPC stats.",
  path: "/incursions",
  badge: "Incursions",
});

export default async function Page() {
  // Both reads are `"use cache"` and throw on a database error rather than
  // catch it; see CLAUDE.md → "Never catch a database error inside a
  // `"use cache"` scope".
  const [data, rats] = await Promise.all([
    readIncursionsData(),
    readIncursionRats(),
  ]);
  return <IncursionsPage data={data} rats={rats} />;
}
