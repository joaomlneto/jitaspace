"use client";

import { useMemo } from "react";
import { Alert, Chip, Container, Group, Stack, Text } from "@mantine/core";
import { parseAsArrayOf, parseAsInteger, useQueryState } from "nuqs";

import type { ESIScope } from "@jitaspace/esi-metadata";
import { EveEntityAvatar, EveEntityName } from "@jitaspace/eve-components";
import {
  CUSTOMS_OFFICES_SCOPE,
  useMultipleCorporationCustomsOffices,
} from "@jitaspace/hooks";

import {
  CustomsOfficesDataTable,
  customsOfficeTotals,
  formatPercent,
  PiPageHeader,
} from "~/components/PlanetaryInteraction";
import { StatsGrid } from "~/components/UI";
import { AccessStatusLine } from "../AccessStatusLine";

// The roles scope too: only a Director's token can read the offices, and the
// app knows a character is a Director only once it can read their roles.
const CUSTOMS_SCOPES: ESIScope[] = [
  CUSTOMS_OFFICES_SCOPE,
  "esi-characters.read_corporation_roles.v1",
];

export default function CustomsOfficesPageClient() {
  const offices = useMultipleCorporationCustomsOffices();

  const [selectedCorporations, setSelectedCorporations] = useQueryState(
    "corporations",
    parseAsArrayOf(parseAsInteger),
  );

  const corporationIds = offices.subjectIds;
  // With a single corporation there are no chips to undo a selection with,
  // so one arriving in a shared link is ignored. Ids that are not reachable
  // corporations are dropped, and a list of nothing but those means all.
  const active = useMemo(() => {
    if (corporationIds.length <= 1 || selectedCorporations === null) {
      return new Set(corporationIds);
    }
    const known = selectedCorporations.filter((id) =>
      corporationIds.includes(id),
    );
    return new Set(
      selectedCorporations.length > 0 && known.length === 0
        ? corporationIds
        : known,
    );
  }, [selectedCorporations, corporationIds]);
  const rows = useMemo(
    () => offices.data.filter((office) => active.has(office.subjectId)),
    [offices.data, active],
  );
  const totals = useMemo(() => customsOfficeTotals(rows), [rows]);

  const isSelectionPending =
    corporationIds.length === 0
      ? offices.isPending
      : offices.pendingSubjectIds.some((id) => active.has(id));
  const showCorporation = corporationIds.length > 1;
  const pending = (value: string) => (offices.isPending ? "…" : value);

  return (
    <Container size="xl">
      <Stack>
        <PiPageHeader
          active="customs-offices"
          title="Customs Offices"
          description="Every customs office your corporations own: who may use it, what it charges, and when it can come out of reinforcement."
        />

        <AccessStatusLine
          isPending={offices.isPending}
          hasAccess={corporationIds.length > 0}
          scopes={CUSTOMS_SCOPES}
          signedOut="Sign in with a Director to see your corporation's customs offices."
          summary={`${offices.data.length} customs ${offices.data.length === 1 ? "office" : "offices"} across ${corporationIds.length} ${corporationIds.length === 1 ? "corporation" : "corporations"}`}
        >
          {showCorporation && (
            <Chip.Group
              multiple
              value={[...active].map(String)}
              onChange={(value) => {
                const next = value.map(Number);
                void setSelectedCorporations(
                  next.length === corporationIds.length ? null : next,
                );
              }}
            >
              <Group gap="xs" role="group" aria-label="Corporations">
                {corporationIds.map((corporationId) => (
                  <Chip
                    key={corporationId}
                    value={String(corporationId)}
                    size="sm"
                    variant="light"
                  >
                    <Group gap={6} wrap="nowrap" component="span">
                      <EveEntityAvatar
                        entityId={corporationId}
                        category="corporation"
                        size={16}
                        alt=""
                      />
                      <EveEntityName
                        span
                        entityId={corporationId}
                        category="corporation"
                      />
                    </Group>
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
          )}
        </AccessStatusLine>

        {offices.errors.length > 0 && (
          <Alert
            color="orange"
            title="Some customs offices could not be loaded"
          >
            <Stack gap={2}>
              {offices.errors.map((error) => (
                <Text key={error.subjectId} size="sm">
                  <EveEntityName
                    span
                    inherit
                    entityId={error.subjectId}
                    category="corporation"
                  />
                  : {error.error.message}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        <StatsGrid
          cols={{ base: 2, sm: 3, lg: 5 }}
          data={[
            {
              title: "Customs offices",
              value: pending(String(totals.offices)),
            },
            { title: "Systems", value: pending(String(totals.systems)) },
            {
              title: "Average corporation tax",
              value: pending(formatPercent(totals.averageCorporationTax)),
            },
            {
              title: "Open to alliance",
              value: pending(String(totals.allianceAccess)),
            },
            {
              title: "Open by standing",
              value: pending(String(totals.standingAccess)),
            },
          ]}
        />

        <CustomsOfficesDataTable
          rows={rows}
          showCorporation={showCorporation}
          isLoading={isSelectionPending && rows.length === 0}
          emptyText={
            showCorporation && active.size === 0
              ? "No corporations selected. Pick one above to see its customs offices."
              : undefined
          }
        />
      </Stack>
    </Container>
  );
}
