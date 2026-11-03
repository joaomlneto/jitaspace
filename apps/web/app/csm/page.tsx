import { CSM_21 } from "~/config/csm";
import { pageMetadata } from "~/lib/metadata";
import PageClient from "./page.client";

export const metadata = pageMetadata({
  title: `${CSM_21.name} Elections`,
  description: `All ${CSM_21.candidates.length} candidates for the 21st Council of Stellar Management, with their pitches, campaign threads and interviews. Voting runs from 22 October to 3 November 2026.`,
  path: "/csm",
  badge: "Council of Stellar Management",
  facts: [
    { label: "Candidates", value: String(CSM_21.candidates.length) },
    { label: "Voting", value: "22 Oct – 3 Nov" },
  ],
});

export default function Page() {
  return <PageClient election={CSM_21} />;
}
