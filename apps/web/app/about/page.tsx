import PageClient from "./page.client";

export const metadata = {
  title: "About",
  description:
    "What JitaSpace is, who builds it, how to get in touch, and the privacy policy covering what the site does and does not collect.",
  alternates: { canonical: "/about" },
};

export default function Page() {
  return <PageClient />;
}
