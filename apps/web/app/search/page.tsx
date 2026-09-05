import { pageMetadata } from "~/lib/metadata";
import PageClient from "./page.client";

export const metadata = pageMetadata({
  title: "Search",
  description:
    "Search EVE Online characters, corporations, alliances, systems, stations and items, and jump straight to any JitaSpace tool.",
  // Self-canonical on purpose: the query lives in `?q=`, results are fetched in
  // the browser, and the server HTML is the same empty search box whatever the
  // query is — so every `?q=` URL is a duplicate, not a document of its own.
  path: "/search",
  badge: "Search",
});

export default function Page() {
  return <PageClient />;
}
