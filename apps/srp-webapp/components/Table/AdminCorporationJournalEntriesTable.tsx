import React from "react";
import { Group, Stack, Table, Tooltip } from "@mantine/core";
import { useSession } from "next-auth/react";

import {
  EveEntityAvatar,
  EveEntityName,
  FormattedDateText,
  ISKAmount,
  OpenInformationWindowActionIcon,
  TimeAgoText,
} from "@jitaspace/ui";

import { api } from "~/utils/api";

function capitalizeFirstLetter(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function AdminCorporationJournalEntriesTable() {
  const { data: session } = useSession();
  const { data: latestTransactions } =
    api.wallet.getAllLatestTransactions.useQuery();

  return (
    <Table fontSize="xs" highlightOnHover>
      <thead>
        <tr>
          <th>Date</th>
          <th>First Party</th>
          <th>Type</th>
          <th>Reason</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {latestTransactions?.map((transaction) => (
          <tr key={transaction.entryId.toString()}>
            <td>
              <Tooltip
                label={<TimeAgoText date={transaction.date} addSuffix />}
              >
                <div>
                  <FormattedDateText date={transaction.date} />
                </div>
              </Tooltip>
            </td>
            <td>
              <Stack>
                <Group position="apart">
                  <Group spacing="xs">
                    <EveEntityAvatar
                      entityId={transaction.firstPartyId ?? undefined}
                      size="sm"
                    />
                    <EveEntityName
                      entityId={transaction.firstPartyId ?? undefined}
                    />
                  </Group>
                  <OpenInformationWindowActionIcon
                    entityId={transaction.firstPartyId ?? undefined}
                  />
                </Group>
                {transaction.contextId && (
                  <Group position="apart">
                    <Group spacing="xs">
                      <EveEntityAvatar
                        entityId={transaction.contextId ?? undefined}
                        size="sm"
                      />
                      <EveEntityName
                        entityId={transaction.contextId ?? undefined}
                      />
                    </Group>
                    <OpenInformationWindowActionIcon
                      entityId={transaction.contextId ?? undefined}
                    />
                  </Group>
                )}
              </Stack>
            </td>
            <td>
              {transaction.entryType
                .split("_")
                .map(capitalizeFirstLetter)
                .join(" ")}
            </td>
            <td>{transaction.reason}</td>
            <td align="right">
              <ISKAmount
                amount={Number(transaction.amount)}
                color={Number(transaction?.amount ?? 0) > 0 ? "green" : "red"}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}