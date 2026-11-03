"use client";

import { useMemo } from "react";
import {
  Alert,
  Anchor,
  Badge,
  Breadcrumbs,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconInfoCircle, IconPackageImport } from "@tabler/icons-react";

import type { DataTableColumn } from "@jitaspace/datatable";
import type { EsiContractBid, EsiContractItem } from "@jitaspace/hooks";
import { CharacterName, TypeAvatar, TypeName } from "@jitaspace/eve-components";
import {
  ContractAuctionIcon,
  ContractCourierIcon,
  ControlCargoInventoryIcon,
} from "@jitaspace/eve-icons";
import { useAuthenticatedContract } from "@jitaspace/hooks";
import { ISKAmount } from "@jitaspace/ui";

import type {
  ContractBidDetail,
  ContractDetail,
  ContractItemDetail,
} from "./data";
import type { ContractSummary } from "~/components/Contracts/contract";
import { CharacterAnchor, TypeAnchor } from "~/components/Anchor";
import {
  CONTRACT_KIND_LABEL,
  fromEsiContract,
} from "~/components/Contracts/contract";
import {
  contractDisplayName,
  ContractIssuer,
  ContractLocationLine,
  ContractStatusBadge,
  ContractTypeBadge,
  ContractTypeIcon,
  formatVolume,
  RelativeTime,
} from "~/components/Contracts/ContractParts";
import { DataTable } from "~/components/DataTable";
import {
  HeroCard,
  HeroStat,
  SectionHeading,
  StatCard,
} from "~/components/EntityPage";
import { HoverPrefetchLink } from "~/components/Link";

/** A bid, from the snapshots (no bidder) or from ESI (with one). */
interface BidRow extends ContractBidDetail {
  bidderId?: number;
}

function formatDateTime(iso: string): string {
  return `${iso.slice(0, 16).replace("T", " ")} EVE`;
}

function fromEsiItem(item: EsiContractItem): ContractItemDetail {
  return {
    recordId: `${item.record_id}`,
    typeId: item.type_id,
    name: null,
    quantity: item.quantity,
    isIncluded: item.is_included,
    // ESI marks a copy with raw_quantity -2.
    isBlueprintCopy: item.raw_quantity === -2 ? true : null,
    // -1 is an original blueprint, -2 a copy; anything else is not one.
    imageVariation:
      item.raw_quantity === -1
        ? "bp"
        : item.raw_quantity === -2
          ? "bpc"
          : undefined,
    materialEfficiency: null,
    timeEfficiency: null,
    runs: null,
    mutation: null,
  };
}

function fromEsiBid(bid: EsiContractBid): BidRow {
  return {
    bidId: bid.bid_id,
    amount: bid.amount,
    dateBid: bid.date_bid,
    bidderId: bid.bidder_id,
  };
}

const itemColumns: DataTableColumn<ContractItemDetail>[] = [
  {
    id: "name",
    header: "Item",
    accessor: (row) => row.name ?? `${row.typeId}`,
    sortable: true,
    cell: (row) => (
      <Group gap="xs" wrap="nowrap">
        <TypeAvatar
          typeId={row.typeId}
          variation={row.imageVariation}
          size={24}
          radius="sm"
        />
        <TypeAnchor typeId={row.typeId} size="sm">
          {row.name ?? <TypeName typeId={row.typeId} span inherit />}
        </TypeAnchor>
        {row.mutation && (
          <Badge size="xs" variant="light" color="grape">
            Mutated
          </Badge>
        )}
      </Group>
    ),
  },
  {
    id: "quantity",
    header: "Quantity",
    accessor: "quantity",
    sortable: true,
    width: 110,
    cell: (row) => row.quantity.toLocaleString(),
  },
  {
    id: "details",
    header: "Details",
    accessor: (row) => blueprintDetails(row),
    cell: (row) => (
      <Text size="sm" c="dimmed">
        {row.mutation
          ? `${row.mutation.mutatorName ?? "Mutaplasmid"} applied`
          : blueprintDetails(row)}
      </Text>
    ),
  },
];

function blueprintDetails(row: ContractItemDetail): string {
  const parts: string[] = [];
  if (row.isBlueprintCopy) parts.push("Copy");
  if (row.runs !== null && row.runs > 0) parts.push(`${row.runs} runs`);
  if (row.materialEfficiency !== null) {
    parts.push(`ME ${row.materialEfficiency}`);
  }
  if (row.timeEfficiency !== null) parts.push(`TE ${row.timeEfficiency}`);
  return parts.join(" · ");
}

const bidColumns: DataTableColumn<BidRow>[] = [
  {
    id: "amount",
    header: "Bid",
    accessor: "amount",
    sortable: true,
    cell: (row) => <ISKAmount amount={row.amount} size="sm" fw={600} />,
  },
  {
    id: "bidder",
    header: "Bidder",
    accessor: (row) => row.bidderId ?? null,
    cell: (row) =>
      row.bidderId ? (
        <CharacterAnchor characterId={row.bidderId} size="sm">
          <CharacterName characterId={row.bidderId} span inherit />
        </CharacterAnchor>
      ) : null,
  },
  {
    id: "date",
    header: "Placed",
    accessor: "dateBid",
    sortable: true,
    cell: (row) => <Text size="sm">{formatDateTime(row.dateBid)}</Text>,
  },
];

const publicBidColumns = bidColumns.filter((column) => column.id !== "bidder");

function ItemsSection({
  title,
  icon,
  items,
}: Readonly<{
  title: string;
  icon: React.ReactNode;
  items: ContractItemDetail[];
}>) {
  if (items.length === 0) return null;
  return (
    <Stack gap="sm">
      <SectionHeading icon={icon}>
        {title}{" "}
        <Text span c="dimmed" inherit fw={400}>
          ({items.length})
        </Text>
      </SectionHeading>
      <DataTable
        data={items}
        columns={itemColumns}
        rowId={(row) => row.recordId}
        withGlobalFilter={items.length > 10}
        withPagination={items.length > 50}
        defaultPageSize={50}
        verticalSpacing="xs"
        highlightOnHover
        striped
      />
    </Stack>
  );
}

function ContractHero({
  contract,
  firstItem,
}: Readonly<{
  contract: ContractSummary;
  firstItem: { typeId: number; imageVariation?: string } | null;
}>) {
  const amounts: { label: string; amount: number | null }[] = [
    {
      label: contract.type === "auction" ? "Starting bid" : "Price",
      amount: contract.price,
    },
    { label: "Reward", amount: contract.reward },
    { label: "Collateral", amount: contract.collateral },
    { label: "Buyout", amount: contract.buyout },
  ];
  if (contract.type === "auction" && contract.highestBid) {
    amounts.unshift({ label: "Highest bid", amount: contract.highestBid });
  }

  return (
    <HeroCard
      artwork={
        firstItem !== null ? (
          <TypeAvatar
            typeId={firstItem.typeId}
            variation={firstItem.imageVariation}
            size={128}
            // A SKIN or the like has no image: show what the contract is.
            fallback={<ContractTypeIcon type={contract.type} size={96} />}
          />
        ) : (
          <ContractTypeIcon type={contract.type} size={96} />
        )
      }
    >
      <Group gap="xs">
        <ContractTypeBadge type={contract.type} />
        {contract.status ? (
          <ContractStatusBadge status={contract.status} />
        ) : contract.isOpen === false ? (
          <Badge variant="dot" color="gray" radius="sm">
            No longer listed
          </Badge>
        ) : (
          <Badge variant="dot" color="teal" radius="sm">
            Open
          </Badge>
        )}
        {contract.availability && contract.availability !== "public" && (
          <Badge variant="outline" color="gray" radius="sm" tt="capitalize">
            {contract.availability}
          </Badge>
        )}
        {contract.forCorporation && (
          <Badge variant="outline" color="gray" radius="sm">
            For corporation
          </Badge>
        )}
      </Group>
      <Title order={1} size="h2" lh={1.2}>
        {contractDisplayName(contract)}
      </Title>
      {contract.title && (
        <Text c="dimmed" fs="italic">
          “{contract.title}”
        </Text>
      )}
      <Group gap="xl" mt="xs">
        {amounts
          .filter((entry) => entry.amount !== null)
          .map((entry) => (
            <HeroStat
              key={entry.label}
              label={entry.label}
              value={<ISKAmount amount={entry.amount ?? 0} span inherit />}
            />
          ))}
        {contract.volume !== null && contract.volume > 0 && (
          <HeroStat label="Volume" value={formatVolume(contract.volume)} />
        )}
      </Group>
    </HeroCard>
  );
}

export default function ContractPage({
  contractId,
  detail,
}: Readonly<{ contractId: number; detail: ContractDetail | null }>) {
  // ESI knows the contract if any authenticated character or corporation can
  // see it — always for private contracts, and with live status, items and
  // bidders for the public ones they issued.
  const esi = useAuthenticatedContract(contractId);

  const contract: ContractSummary | null = useMemo(() => {
    if (!esi.contract) return detail?.contract ?? null;
    const live = fromEsiContract(esi.contract);
    if (!detail) return live;
    // Live fields from ESI; names, region and the item summary from our row.
    return {
      ...detail.contract,
      ...live,
      issuerName: detail.contract.issuerName,
      issuerCorporationName: detail.contract.issuerCorporationName,
      start: detail.contract.start ?? live.start,
      end: detail.contract.end ?? live.end,
      regionId: detail.contract.regionId,
      regionName: detail.contract.regionName,
    };
  }, [esi.contract, detail]);

  const items: ContractItemDetail[] | undefined = useMemo(() => {
    // Our rows carry blueprint and mutation details ESI's private listing
    // does not, so they win when both exist.
    if (detail && detail.items.length > 0) return detail.items;
    // A public courier has no item lines; say so rather than wait on ESI.
    return esi.items?.map(fromEsiItem) ?? detail?.items;
  }, [detail, esi.items]);

  const bids: BidRow[] = useMemo(() => {
    if (esi.bids) {
      return esi.bids.map(fromEsiBid).sort((a, b) => b.amount - a.amount);
    }
    return detail?.bids ?? [];
  }, [detail, esi.bids]);

  if (contract === null) {
    return (
      <Container size="xl">
        <Stack mt="xl">
          <Breadcrumbs>
            <Anchor component={HoverPrefetchLink} href="/contracts" size="sm">
              Contracts
            </Anchor>
            <Text size="sm">#{contractId}</Text>
          </Breadcrumbs>
          <Title order={1} size="h2">
            Contract #{contractId}
          </Title>
          {esi.isPending ? (
            <Group gap="sm">
              <Loader size="sm" />
              <Text c="dimmed">Looking for contract #{contractId}…</Text>
            </Group>
          ) : (
            <Alert
              color="gray"
              variant="light"
              icon={<IconInfoCircle size={18} />}
              title={`Contract #${contractId} is not available`}
            >
              It is not among the public contracts we have recorded, and none of
              your characters or their corporations can see it. Private
              contracts are only visible to their issuer and assignee — sign in
              with one of them to see it.
            </Alert>
          )}
        </Stack>
      </Container>
    );
  }

  const offered = items?.filter((item) => item.isIncluded) ?? [];
  const asked = items?.filter((item) => !item.isIncluded) ?? [];
  const firstItem = offered[0] ?? contract.items?.first ?? null;
  const isCourier = contract.type === "courier";
  // A structure's name needs a token on its access list. The issuer listed
  // the contract there, so their own contracts' start locations are safe to
  // ask about; anyone else's could 403, which ESI counts against the error
  // budget.
  const viewerIssued =
    esi.source?.kind === "character" &&
    esi.contract?.issuer_id === esi.source.subjectId;

  return (
    <Container size="xl">
      <Stack gap="lg" mt="md">
        <Breadcrumbs>
          <Anchor component={HoverPrefetchLink} href="/contracts" size="sm">
            Contracts
          </Anchor>
          <Text size="sm" c="dimmed">
            {CONTRACT_KIND_LABEL[contract.type]}
          </Text>
          <Text size="sm">#{contract.contractId}</Text>
        </Breadcrumbs>

        <ContractHero
          contract={
            // The live bids, when ESI has them, are newer than our snapshot's.
            bids.length > 0
              ? {
                  ...contract,
                  highestBid: Math.max(...bids.map((b) => b.amount)),
                }
              : contract
          }
          firstItem={firstItem}
        />

        {detail && !esi.contract && detail.contract.isOpen === false && (
          <Alert
            color="gray"
            variant="light"
            icon={<IconInfoCircle size={18} />}
          >
            The public listing stopped showing this contract{" "}
            {detail.contract.lastSeenAt
              ? `after ${formatDateTime(detail.contract.lastSeenAt)}`
              : ""}
            {detail.endReason === "Expired"
              ? ", when it expired."
              : " before it expired — it was accepted, completed or deleted."}
          </Alert>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <StatCard
            label="Issued by"
            value={<ContractIssuer contract={contract} />}
            sub={
              contract.forCorporation ? (
                <>
                  by{" "}
                  <CharacterAnchor characterId={contract.issuerId} size="xs">
                    {contract.issuerName ?? (
                      <CharacterName
                        characterId={contract.issuerId}
                        span
                        inherit
                      />
                    )}
                  </CharacterAnchor>
                </>
              ) : undefined
            }
          />
          <StatCard
            label={isCourier ? "Pick up" : "Location"}
            value={
              <ContractLocationLine
                location={contract.start}
                regionName={contract.regionName}
                resolveStructures={viewerIssued}
              />
            }
            sub={contract.regionName ?? undefined}
          />
          {isCourier && (
            <StatCard
              label="Deliver to"
              value={
                <ContractLocationLine
                  location={contract.end}
                  // Who can see the destination is not ours to know; asking
                  // ESI would risk a 403 against the error budget.
                  resolveStructures={false}
                />
              }
              sub={
                contract.daysToComplete
                  ? `${contract.daysToComplete} days to complete`
                  : undefined
              }
            />
          )}
          <StatCard
            label="Issued"
            value={formatDateTime(contract.dateIssued)}
            sub={<RelativeTime date={contract.dateIssued} />}
          />
          <StatCard
            label="Expires"
            value={formatDateTime(contract.dateExpired)}
            sub={<RelativeTime date={contract.dateExpired} />}
          />
          {detail?.firstSeenAt && (
            <StatCard
              label="Seen in public listings"
              value={`${detail.firstSeenAt.slice(0, 10)} → ${
                detail.contract.lastSeenAt?.slice(0, 10) ?? "?"
              }`}
              sub="Snapshots this contract appeared in"
            />
          )}
        </SimpleGrid>

        {items === undefined && esi.isLoadingDetails && (
          <Group gap="sm">
            <Loader size="sm" />
            <Text c="dimmed">Loading items…</Text>
          </Group>
        )}
        <ItemsSection
          title={asked.length > 0 ? "You get" : "Items"}
          icon={
            <ControlCargoInventoryIcon size={20} color="currentColor" alt="" />
          }
          items={offered}
        />
        <ItemsSection
          title="You give"
          icon={<IconPackageImport size={20} />}
          items={asked}
        />
        {isCourier && items?.length === 0 && (
          <Text c="dimmed" size="sm">
            <ContractCourierIcon size={14} alt="" /> Courier contracts do not
            list their cargo publicly.
          </Text>
        )}

        {contract.type === "auction" && (
          <Stack gap="sm">
            <SectionHeading icon={<ContractAuctionIcon size={20} alt="" />}>
              Bids{" "}
              <Text span c="dimmed" inherit fw={400}>
                ({bids.length})
              </Text>
            </SectionHeading>
            {bids.length === 0 ? (
              <Text c="dimmed" size="sm">
                No bids recorded yet.
              </Text>
            ) : (
              <DataTable
                data={bids}
                // Public bids carry no bidder; only ESI's own listing does.
                columns={
                  bids.some((bid) => bid.bidderId !== undefined)
                    ? bidColumns
                    : publicBidColumns
                }
                rowId={(row) => row.bidId}
                withPagination={bids.length > 50}
                defaultPageSize={50}
                initialSort={{ columnId: "amount", direction: "desc" }}
                verticalSpacing="xs"
                highlightOnHover
                striped
              />
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
