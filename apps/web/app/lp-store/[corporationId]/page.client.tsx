"use client";

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
import { CorporationAvatar } from "@jitaspace/ui";

import { LoyaltyPointsTable } from "~/components/LPStore";

export interface LPStoreCorporationPageProps {
  corporation: { corporationId: number; name: string };
  types: { typeId: number; name: string }[];
  offers: {
    offerId: number;
    corporationId: number;
    typeId: number;
    quantity: number;
    akCost: number | null;
    lpCost: number;
    iskCost: number;
    requiredItems: {
      typeId: number;
      quantity: number;
    }[];
  }[];
}

export default function LPStoreCorporationPage({
  corporation,
  offers,
  types,
}: LPStoreCorporationPageProps) {
  return (
    <>
      <Container size="xl">
        <Breadcrumbs>
          <Group>
            <LPStoreIcon width={48} />
            <Anchor component={Link} href="/lp-store">
              <Title>LP Store</Title>
            </Anchor>
          </Group>
          <Group>
            <CorporationAvatar corporationId={corporation.corporationId} />
            <Title>{corporation.name}</Title>
          </Group>
        </Breadcrumbs>
      </Container>
      <Stack mt="xl">
        <Container fluid>
          <LoyaltyPointsTable
            corporations={[corporation]}
            offers={offers}
            types={types}
          />
        </Container>
      </Stack>
    </>
  );
}
