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

import { LoyaltyPointsTable } from "~/components/LPStore";

export interface LPStoreAllPageProps {
  corporations: { corporationId: number; name: string }[];
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

export default function LPStoreAllPage({
  corporations,
  types,
  offers,
}: LPStoreAllPageProps) {
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
          offers={offers}
          types={types}
        />
      </Stack>
    </Container>
  );
}
