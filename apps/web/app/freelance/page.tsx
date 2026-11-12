import { pageMetadata } from "~/lib/metadata";
import FreelanceBoardPage from "./page.client";

export const metadata = pageMetadata({
  title: "Freelance Jobs",
  description:
    "Browse every active EVE Online freelance job: what it asks for, how far along it is, and how much ISK is left to earn.",
  path: "/freelance",
  badge: "Freelance Jobs",
});

// Static: the jobs are fetched from ESI in the browser, so the prerendered
// page is the shell and its loading table.
export default function Page() {
  return <FreelanceBoardPage />;
}
