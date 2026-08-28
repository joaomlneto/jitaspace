"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Anchor,
  Breadcrumbs,
  Container,
  Group,
  Stack,
  Title,
} from "@mantine/core";

import { LPStoreIcon } from "@jitaspace/eve-icons";

import type { EncodedOffer } from "./encoding";
import { LoyaltyPointsTable } from "~/components/LPStore";
import { decodeOffer } from "./encoding";

export interface LPStoreAllPageProps {
  corporations: { corporationId: number; name: string }[];
  types: { typeId: number; name: string }[];
  /**
   * Positionally encoded — see ./encoding. Every offer crosses the
   * server/client boundary twice (rendered HTML plus the RSC flight payload),
   * so at ~33,000 offers the repeated JSON key names cost more than the data.
   */
  offers: EncodedOffer[];
}

export default function LPStoreAllPage({
  corporations,
  types,
  offers,
}: Readonly<LPStoreAllPageProps>) {
  // Decoded once per payload, not per render: the table wants objects, and
  // rebuilding 33,000 of them on every render would undo the point.
  const decodedOffers = useMemo(() => offers.map(decodeOffer), [offers]);

  return (
    <Container size="xl">
      <Stack>
        <Breadcrumbs>
          <Group>
            <LPStoreIcon width={48} />
            <Anchor component={Link} href="/lp-store">
              <Title>LP Store</Title>
            </Anchor>
          </Group>
          <Group>
            <Title>All offers</Title>
          </Group>
        </Breadcrumbs>
        <LoyaltyPointsTable
          corporations={corporations}
          offers={decodedOffers}
          types={types}
        />
      </Stack>
    </Container>
  );
}
