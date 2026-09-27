import { useMemo } from "react";
import { Badge, Table } from "@mantine/core";

import type { ESIScope } from "@jitaspace/esi-metadata";
import { getScopeDescription } from "@jitaspace/esi-metadata";

import classes from "./ScopesTable.module.css";

/**
 * Splits a scope into the category and permission shown in its badges.
 *
 * ESI names scopes in two conventions: the legacy `esi-{domain}.{action}.v{N}`
 * (`esi-skills.read_skills.v1`) and, since compatibility date 2026-08-18,
 * `esi.{domain}.{subject}:{action}` (`esi.cosmetic.char:read`). The second is
 * rendered verb-first ("read char") to read like the first ("read skills").
 */
const parseScope = (scope: string) => {
  const parts = scope.split(".");
  if (parts[0] === "esi") {
    const [subject = "", action = ""] = (parts[2] ?? "").split(":");
    return {
      category: parts[1] ?? "",
      rawPermission: [action, subject].filter(Boolean).join(" "),
    };
  }
  return {
    category: (parts[0] ?? "").slice(4),
    rawPermission: parts[1] ?? "",
  };
};

export interface ScopesTableProps {
  scopes?: ESIScope[];
  showRawScopeNames?: boolean;
}

export function ScopesTable({
  scopes,
  showRawScopeNames,
}: Readonly<ScopesTableProps>) {
  const normalizedScopes = useMemo(
    () =>
      Array.isArray(scopes)
        ? scopes.toSorted((a, b) => a.localeCompare(b))
        : [],
    [scopes],
  );

  const scopeData: {
    id: ESIScope;
    category: string;
    permission: string;
    description: string;
  }[] = useMemo(
    () =>
      normalizedScopes.map((scope: ESIScope) => {
        const { category, rawPermission: unspaced } = parseScope(scope);
        const rawPermission = unspaced.replaceAll("_", " ");
        const permission = category
          ? rawPermission.replaceAll(category, "")
          : rawPermission;
        return {
          id: scope,
          category,
          permission,
          description: getScopeDescription(scope),
        };
      }),
    [normalizedScopes],
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
              <Table.Td>
                <Badge size="xs" variant="light" color="dark">
                  {scope.id}
                </Badge>
              </Table.Td>
            )}
            <Table.Td align="left">{scope.description}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
