import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { CONTRACT_KIND_LABEL } from "~/components/Contracts/contract";
import { PageSkeleton } from "~/components/PageSkeleton";
import { pageMetadata } from "~/lib/metadata";
import { parsePositiveEntityId } from "~/lib/routeParams";
import { readContractDetail } from "./data";
import ContractPage from "./page.client";

/** What a contract is called in a title: its first item, or its own title. */
function contractName(
  detail: NonNullable<Awaited<ReturnType<typeof readContractDetail>>>,
): string {
  const { contract } = detail;
  const first = contract.items?.first;
  if (first?.name) {
    const more = (contract.items?.count ?? 1) - 1;
    return `${first.name}${more > 0 ? ` + ${more} more` : ""}`;
  }
  return contract.title || CONTRACT_KIND_LABEL[contract.type];
}

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ contractId: string }>;
}>): Promise<Metadata> {
  const { contractId: raw } = await params;
  const contractId = parsePositiveEntityId(raw);
  if (contractId === null) return {};

  // Uncaught, like the page body: this route is cached whole.
  const detail = await readContractDetail(contractId);
  if (detail === null) {
    // A private contract, or one we never recorded: the page looks it up
    // through the visitor's own ESI access, so there is nothing to describe.
    return { title: `Contract #${contractId}`, robots: { index: false } };
  }
  const { contract } = detail;
  const kind = CONTRACT_KIND_LABEL[contract.type];
  const where = contract.start?.solarSystemName ?? contract.regionName;
  return pageMetadata({
    title: `${contractName(detail)} — ${kind} Contract`,
    description: `${kind} contract #${contractId}${
      where ? ` in ${where}` : ""
    } on EVE Online's public contract market — its items${
      contract.type === "auction" ? ", bids" : ""
    } and terms.`,
    path: `/contracts/${contractId}`,
    badge: `${kind} Contract`,
    facts: [
      ...(contract.regionName
        ? [{ label: "Region", value: contract.regionName }]
        : []),
      ...(contract.items
        ? [{ label: "Items", value: `${contract.items.count}` }]
        : []),
    ],
  });
}

// ISR per contract: without `generateStaticParams` an unlisted id re-renders on
// every request (see apps/web/CLAUDE.md → "ISR for a dynamic `[param]` route").
// The build cannot reach the contracts (CI's database is empty), and Cache
// Components rejects an empty list, so this lists an id `parsePositiveEntityId`
// refuses, which prerenders as a 404 without a query.
export function generateStaticParams() {
  return [{ contractId: "0" }];
}

async function PageContent({
  params,
}: Readonly<{
  params: Promise<{ contractId: string }>;
}>) {
  const { contractId: raw } = await params;
  const contractId = parsePositiveEntityId(raw);
  if (contractId === null) notFound();
  // Uncaught: a database failure must throw rather than cache a page that
  // says the contract does not exist. `null` is not a 404 either: the client
  // looks a private contract up through the visitor's own ESI access.
  const detail = await readContractDetail(contractId);
  return <ContractPage contractId={contractId} detail={detail} />;
}

export default function Page({
  params,
}: Readonly<{
  params: Promise<{ contractId: string }>;
}>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent params={params} />
    </Suspense>
  );
}
