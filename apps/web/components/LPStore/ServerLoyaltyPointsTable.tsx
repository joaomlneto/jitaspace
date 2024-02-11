import React from "react";
import { Table } from "@mantine/core";





type ServerLoyaltyPointsTableProps = {
  corporations: {
    corporationId: number;
    name: string;
  }[];
  types: {
    typeId: number;
    name: string;
  }[];
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
};

export const ServerLoyaltyPointsTable = ({
  corporations,
  types,
  offers,
}: ServerLoyaltyPointsTableProps) => {
  return (
    <Table>
      <Table.Thead>
        <Table.Th>Item</Table.Th>
        <Table.Th>LP Cost</Table.Th>
        <Table.Th>ISK Cost</Table.Th>
      </Table.Thead>
      <Table.Tbody></Table.Tbody>
    </Table>
  );
};
