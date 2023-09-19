import { useMemo } from "react";
import { Badge, Table, useMantineTheme } from "@mantine/core";

import { getScopeDescription, type ESIScope } from "@jitaspace/esi-client";

export type ScopesTableProps = {
  scopes: ESIScope[];
  showRawScopeNames?: boolean;
};

export function ScopesTable({ scopes, showRawScopeNames }: ScopesTableProps) {
  const theme = useMantineTheme();

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
    <Table
      fz="xs"
      style={{
        maxWidth: 800,
        margin: "auto",
        marginTop: theme.spacing.xl,
        marginBottom: `calc(${theme.spacing.xl} * 1.5)`,
      }}
      highlightOnHover
    >
      <tbody>
        {scopeData.map((scope) => (
          <tr key={scope.id}>
            {!showRawScopeNames && (
              <>
                <td>
                  <Badge size="xs" variant="light" color="dark">
                    {scope.category}
                  </Badge>
                </td>
                <td>
                  <Badge size="xs" variant="light" color="dark">
                    {scope.permission}
                  </Badge>
                </td>
              </>
            )}
            {showRawScopeNames && (
              <>
                <td>
                  <Badge size="xs" variant="light" color="dark">
                    {scope.id}
                  </Badge>
                </td>
              </>
            )}
            <td align="left">{scope.description}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
