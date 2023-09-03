import { Table, Tooltip } from "@mantine/core";

import { FormattedDateText, ISKAmount, TimeAgoText } from "@jitaspace/ui";

import { api } from "~/utils/api";

function capitalizeFirstLetter(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function PublicCorporationJournalEntriesTable() {
  const { data: latestTransactions } =
    api.wallet.getAnonymizedLatestTransactions.useQuery();

  return (
    <Table fontSize="xs" highlightOnHover>
      <tbody>
        {latestTransactions?.map((transaction) => (
          <tr key={transaction.id.toString()}>
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
              {transaction.type.split("_").map(capitalizeFirstLetter).join(" ")}
            </td>
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
