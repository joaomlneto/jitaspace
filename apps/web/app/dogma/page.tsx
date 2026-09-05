import PageClient from "./page.client";

export const metadata = {
  title: "Dogma System",
  description:
    "EVE Online's dogma system — the attributes that describe every ship, module and skill, and the effects that make them do something.",
  alternates: { canonical: "/dogma" },
};

export default function Page() {
  return <PageClient />;
}
