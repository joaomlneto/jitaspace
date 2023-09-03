import React from "react";
import { Table, Tooltip } from "@mantine/core";

import { FormattedDateText, ISKAmount, TimeAgoText } from "@jitaspace/ui";

import { api } from "~/utils/api";

function capitalizeFirstLetter(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function CharacterCorporationJournalEntriesTable() {
  const { data: latestTransactions } =
    api.wallet.getMyLatestTransactions.useQuery();

  //if (latestTransactions?.length === 0) return <Text>No entries found.</Text>;

  return (
    <Table fontSize="xs" highlightOnHover>
      <thead>
        <th>Date</th>
        <th>Type</th>
        <th>Reason</th>
        <th>Amount</th>
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
              {transaction.entryType
                .split("_")
                .map(capitalizeFirstLetter)
                .join(" ")}
            </td>
            <td>{transaction.reason}</td>
            <td align="right">
              <ISKAmount
                amount={Number(transaction.amount)}
                color={transaction?.amount ?? 0 > 0 ? "green" : "red"}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
