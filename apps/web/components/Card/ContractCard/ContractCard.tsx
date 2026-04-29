"use client";

import type { CardProps } from "@mantine/core";
import { memo } from "react";
import { Badge, Card, Group, Text } from "@mantine/core";

import {
  CharacterName,
  CorporationName,
  FormattedDateText,
  ISKAmount,
} from "@jitaspace/ui";

import classes from "./ContractCard.module.css";

export type ContractCardProps = Omit<CardProps, "children"> & {
  contract: {
    contract_id: number;
    title?: string;
    type: string;
    status: string;
    issuer_id: number;
    issuer_corporation_id: number;
    date_issued: string;
    date_expired: string;
    price?: number;
    reward?: number;
    collateral?: number;
    buyout?: number;
  };
};

export const ContractCard = memo(
  ({ contract, ...otherProps }: ContractCardProps) => {
    return (
      <Card withBorder radius="md" className={classes.card} {...otherProps}>
        <Card.Section className={classes.imageSection}>
          <Group wrap="nowrap" justify="space-between">
            <div>
              <Text fw={700} className={classes.headerName} lineClamp={1}>
                {contract.title || `Contract #${contract.contract_id}`}
              </Text>
              <Group gap="xs">
                <Badge size="xs" variant="outline">
                  {contract.type}
                </Badge>
                <Badge size="xs">{contract.status}</Badge>
              </Group>
            </div>
            <FormattedDateText
              date={new Date(contract.date_issued)}
              size="xs"
              c="dimmed"
            />
          </Group>

          <Group mt="md" wrap="nowrap" gap="xs">
            <div style={{ flex: 1 }}>
              <Text size="xs" c="dimmed">
                Issuer
              </Text>
              <CharacterName
                characterId={contract.issuer_id}
                size="sm"
                fw={500}
              />
              <CorporationName
                corporationId={contract.issuer_corporation_id}
                size="xs"
                c="dimmed"
              />
            </div>
            <div>
              {(contract.price !== undefined ||
                contract.reward !== undefined ||
                contract.buyout !== undefined) && (
                <>
                  <Text size="xs" c="dimmed" ta="right">
                    {contract.type === "auction"
                      ? "Current Bid"
                      : "Price/Reward"}
                  </Text>
                  <ISKAmount
                    amount={
                      contract.price || contract.reward || contract.buyout
                    }
                    size="sm"
                    fw={700}
                  />
                </>
              )}
            </div>
          </Group>
        </Card.Section>
      </Card>
    );
  },
);
ContractCard.displayName = "ContractCard";
