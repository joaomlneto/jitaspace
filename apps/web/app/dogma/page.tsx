import { pageMetadata } from "~/lib/metadata";
import PageClient from "./page.client";

export const metadata = pageMetadata({
  title: "Dogma System",
  description:
    "EVE Online's dogma system — the attributes that describe every ship, module and skill, and the effects that make them do something.",
  path: "/dogma",
  badge: "Dogma",
});

export default function Page() {
  return <PageClient />;
}
