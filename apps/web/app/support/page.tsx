import { pageMetadata } from "~/lib/metadata";
import { SupportContent } from "./SupportContent";

export const metadata = pageMetadata({
  title: "Support",
  description:
    "Ways to support JitaSpace — join the community, shop with creator code JITA, sponsor development, or send ISK in-game.",
  path: "/support",
  badge: "JitaSpace",
});

export default function SupportPage() {
  return <SupportContent />;
}
