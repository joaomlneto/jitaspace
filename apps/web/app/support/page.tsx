import { SupportContent } from "./SupportContent";

export const metadata = {
  title: "Support",
  description:
    "Ways to support JitaSpace — join the community, shop with creator code JITA, sponsor development, or send ISK in-game.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return <SupportContent />;
}
