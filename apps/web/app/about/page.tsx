import { pageMetadata } from "~/lib/metadata";
import PageClient from "./page.client";

export const metadata = pageMetadata({
  title: "About",
  description:
    "What JitaSpace is, who builds it, how to get in touch, and the privacy policy covering what the site does and does not collect.",
  path: "/about",
  badge: "JitaSpace",
});

export default function Page() {
  return <PageClient />;
}
