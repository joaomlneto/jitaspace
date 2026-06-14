"use client";

import type { ReactNode } from "react";
import { Badge, Table, Text } from "@mantine/core";

import type { TimelineEvent } from "~/lib/history";
import { deltaKind } from "~/lib/history";
import { DeltaValue, entityValueFor, RichValue } from "./_delta";
import { DELTA_COLOR } from "./_diff";
import { SubKeyLabel } from "./_labels";

// One fixed-column grid shared by every section (added and modified alike), so
// field / badge / value line up identically across the whole timeline.
const FIELD_COL_WIDTH = 240;
const BADGE_COL_WIDTH = 90;

function FieldsTable({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Table
      layout="fixed"
      verticalSpacing={4}
      horizontalSpacing="sm"
      fz="sm"
      mt={4}
    >
      <Table.Tbody>{children}</Table.Tbody>
    </Table>
  );
}

function FieldRow({
  label,
  badge,
  children,
}: Readonly<{
  label: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}>) {
  // A badge'd row (added/removed) is single-line; baseline-align so the small
  // badge text sits on the same baseline as the larger value (centre-aligning
  // wouldn't, because the font sizes differ). Badge-less rows (changed) may hold
  // a multi-line sub-diff, so top-align and let the label track its first line.
  const valign = { verticalAlign: badge ? "baseline" : "top" } as const;
  return (
    <Table.Tr>
      <Table.Td w={FIELD_COL_WIDTH} style={valign}>
        {label}
      </Table.Td>
      <Table.Td w={BADGE_COL_WIDTH} style={valign}>
        {badge}
      </Table.Td>
      <Table.Td style={valign}>{children}</Table.Td>
    </Table.Tr>
  );
}

// The collection + kind are carried by the chips above each section, so the
// content itself stays terse.
export function EventContent({
  event,
  entityType,
}: Readonly<{
  event: TimelineEvent;
  entityType: string;
}>) {
  const isTypes = (event.collection ?? "types") === "types";
  // In requiredSkillsForTypes the field names themselves are skill typeIDs.
  const fieldLabel = (field: string) =>
    event.collection === "requiredSkillsForTypes" && /^\d+$/.test(field) ? (
      <SubKeyLabel keyField="skillTypeID" id={field} />
    ) : (
      <Text size="sm" fw={500}>
        {field}
      </Text>
    );
  if (event.kind === "added") {
    if (!event.values) {
      return (
        <Text size="sm" c="dimmed">
          {isTypes ? "Type introduced." : "Initial data recorded."}
        </Text>
      );
    }
    const entries = Object.entries(event.values).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return (
      <FieldsTable>
        {entries.map(([field, value]) => (
          <FieldRow key={field} label={fieldLabel(field)}>
            {entityValueFor(field, value, entityType) ?? (
              <RichValue value={value} />
            )}
          </FieldRow>
        ))}
      </FieldsTable>
    );
  }
  if (event.kind === "removed") {
    // The pre-image (last-known values before removal) is kept so diffs stay
    // composable; surface it here too — "what it looked like before deletion".
    const lastValues = event.values
      ? Object.entries(event.values).sort(([a], [b]) => a.localeCompare(b))
      : [];
    return (
      <>
        <Text size="sm" c="dimmed">
          {isTypes ? "Type removed from the static data." : "Data removed."}
        </Text>
        {lastValues.length > 0 && (
          <>
            <Text size="xs" c="dimmed" mt={6}>
              Last recorded values
            </Text>
            <FieldsTable>
              {lastValues.map(([field, value]) => (
                <FieldRow key={field} label={fieldLabel(field)}>
                  <span style={{ opacity: 0.6 }}>
                    {entityValueFor(field, value, entityType) ?? (
                      <RichValue value={value} />
                    )}
                  </span>
                </FieldRow>
              ))}
            </FieldsTable>
          </>
        )}
      </>
    );
  }
  // modified
  const rows = Object.entries(event.fields);
  return (
    <FieldsTable>
      {rows.map(([field, delta]) => {
        const kind = deltaKind(delta);
        // Most fields are just "changed", so a badge for it is noise — only
        // flag the exceptions where a whole field appears or disappears.
        return (
          <FieldRow
            key={field}
            label={fieldLabel(field)}
            badge={
              kind === "changed" ? undefined : (
                <Badge size="xs" variant="light" color={DELTA_COLOR[kind]}>
                  {kind}
                </Badge>
              )
            }
          >
            <DeltaValue
              field={field}
              delta={delta}
              kind={kind}
              entityType={entityType}
            />
          </FieldRow>
        );
      })}
    </FieldsTable>
  );
}
