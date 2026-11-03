"use client";

import { memo } from "react";
import { Paper, Skeleton, Text } from "@mantine/core";

import { TypeAvatar } from "@jitaspace/eve-components";
import { ISKAmount } from "@jitaspace/ui";

import type { ContractSummary } from "./contract";
import { ContractAnchor } from "~/components/Anchor";
import { CONTRACT_KIND_LABEL, contractHeadlineIsk } from "./contract";
import {
  contractDisplayName,
  ContractIssuer,
  ContractLocationLine,
  ContractStatusBadge,
  ContractTypeIcon,
  ExpiryText,
} from "./ContractParts";
import classes from "./ContractRow.module.css";

export interface ContractRowProps {
  contract: ContractSummary;
  /** See ContractCard: name structures only for the visitor's own contracts. */
  resolveStructures?: boolean;
}

/**
 * One contract on one line: the compact counterpart of ContractCard, for
 * scanning many at once. On a narrow screen the line wraps into two.
 */
export const ContractRow = memo(function ContractRow({
  contract,
  resolveStructures = false,
}: Readonly<ContractRowProps>) {
  const headline = contractHeadlineIsk(contract);
  const first = contract.items?.first;
  const isCourier = contract.type === "courier";
  const destination =
    isCourier &&
    contract.end &&
    contract.end.locationId !== contract.start?.locationId
      ? contract.end
      : null;

  return (
    <div className={classes.row}>
      <div className={classes.what}>
        <span
          className={classes.kind}
          title={CONTRACT_KIND_LABEL[contract.type]}
        >
          <ContractTypeIcon type={contract.type} size={18} />
        </span>
        {first ? (
          <TypeAvatar typeId={first.typeId} size={28} radius="sm" />
        ) : (
          <span className={classes.avatarGap} />
        )}
        <div className={classes.name}>
          <ContractAnchor
            contractId={contract.contractId}
            size="sm"
            fw={600}
            truncate
          >
            {contractDisplayName(contract)}
          </ContractAnchor>
          {contract.title && first ? (
            <Text size="xs" c="dimmed" truncate>
              {contract.title}
            </Text>
          ) : null}
        </div>
      </div>

      <div className={classes.isk}>
        {headline.amount === null ? (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ) : (
          <ISKAmount amount={headline.amount} size="sm" fw={700} c="bright" />
        )}
        <Text
          size="xs"
          c="dimmed"
          className={
            isCourier && contract.collateral !== null
              ? undefined
              : classes.iskLabel
          }
        >
          {isCourier && contract.collateral !== null ? (
            <>
              <ISKAmount amount={contract.collateral} span inherit /> collateral
            </>
          ) : (
            headline.label
          )}
        </Text>
      </div>

      <div className={classes.where}>
        <ContractLocationLine
          location={contract.start}
          regionName={contract.regionName}
          resolveStructures={resolveStructures}
          size="xs"
        />
        {destination ? (
          <div className={classes.destination}>
            <Text size="xs" c="dimmed" span>
              →
            </Text>
            <ContractLocationLine
              location={destination}
              resolveStructures={resolveStructures}
              size="xs"
            />
          </div>
        ) : null}
      </div>

      <div className={classes.who}>
        <ContractIssuer contract={contract} size="xs" />
      </div>

      <div className={classes.when}>
        {contract.status && contract.status !== "outstanding" ? (
          <ContractStatusBadge status={contract.status} size="xs" />
        ) : (
          <Text size="xs" c="dimmed">
            <ExpiryText date={contract.dateExpired} />
          </Text>
        )}
      </div>
    </div>
  );
});

/** A bordered list of rows, divided like the war list. */
export function ContractRowList({
  contracts,
  resolveStructures,
}: Readonly<{ contracts: ContractSummary[]; resolveStructures?: boolean }>) {
  return (
    <Paper withBorder radius="md" className={classes.list}>
      {contracts.map((contract) => (
        <ContractRow
          key={contract.contractId}
          contract={contract}
          resolveStructures={resolveStructures}
        />
      ))}
    </Paper>
  );
}

export function ContractRowListSkeleton({
  count,
}: Readonly<{ count: number }>) {
  return (
    <Paper withBorder radius="md" className={classes.list}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={classes.row}>
          <div className={classes.what}>
            <Skeleton height={28} width={28} />
            <Skeleton height={14} width="70%" />
          </div>
          <Skeleton height={14} width={80} />
          <Skeleton height={12} width="80%" />
          <Skeleton height={12} width="60%" />
          <Skeleton height={12} width={70} />
        </div>
      ))}
    </Paper>
  );
}
