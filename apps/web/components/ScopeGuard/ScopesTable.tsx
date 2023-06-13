import { Badge, createStyles, Table } from "@mantine/core";

import { getScopeDescription, type ESIScope } from "@jitaspace/esi-client";

const useStyles = createStyles((theme) => ({
  scopesTable: {
    maxWidth: 800,
    margin: "auto",
    marginTop: theme.spacing.xl,
    marginBottom: `calc(${theme.spacing.xl} * 1.5)`,
  },
}));

export type ScopesTableProps = {
  scopes: ESIScope[];
};

export function ScopesTable({ scopes }: ScopesTableProps) {
  const { classes } = useStyles();

  const scopeData: {
    id: ESIScope;
    category: string;
    permission: string;
    description: string;
  }[] = scopes.map((scope: ESIScope) => {
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
  });

  return (
    <Table fontSize="xs" className={classes.scopesTable} highlightOnHover>
      <tbody>
        {scopeData.map((scope) => (
          <tr key={scope.id}>
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
            {}
            <td align="left">{scope.description}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
