import {type ESIScope, getScopeDescription} from "@jitaspace/esi-metadata";
import {Badge, Table} from "@mantine/core";
import {useMemo} from "react";

import classes from "./ScopesTable.module.css";


export type ScopesTableProps = {
  scopes: ESIScope[];
  showRawScopeNames?: boolean;
};

export function ScopesTable({scopes, showRawScopeNames}: ScopesTableProps) {
  const scopeData: {
    id: ESIScope;
    category: string;
    permission: string;
    description: string;
  }[] = useMemo(
    () =>
      scopes.sort().map((scope: ESIScope) => {
        const category = (scope.split(".")[0] ?? "").slice(4);
        const permission = (scope.split(".")[1] ?? "")
          .replaceAll("_", " ")
          .replaceAll(category, "");
        return {
          id: scope,
          category,
          permission,
          description: getScopeDescription(scope),
        };
      }),
    [scopes],
  );

  return (
    <Table fz="xs" className={classes.scopesTable} highlightOnHover>
      <Table.Tbody>
        {scopeData.map((scope) => (
          <Table.Tr key={scope.id}>
            {!showRawScopeNames && (
              <>
                <Table.Td>
                  <Badge size="xs" variant="light" color="dark">
                    {scope.category}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge size="xs" variant="light" color="dark">
                    {scope.permission}
                  </Badge>
                </Table.Td>
              </>
            )}
            {showRawScopeNames && (
              <>
                <Table.Td>
                  <Badge size="xs" variant="light" color="dark">
                    {scope.id}
                  </Badge>
                </Table.Td>
              </>
            )}
            <Table.Td align="left">{scope.description}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
