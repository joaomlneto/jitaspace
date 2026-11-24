"use client";

import { useParams } from "next/navigation";
import { Container, Group, Stack, Text, Title } from "@mantine/core";

import {
  CorporationName,
  TypeAvatar,
  TypeName,
} from "@jitaspace/eve-components";
import { useBloodline, useRace } from "@jitaspace/hooks";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import { CorporationAvatar } from "@jitaspace/ui";

import { CorporationAnchor, RaceAnchor, TypeAnchor } from "~/components/Anchor";
import { RaceAvatar } from "~/components/Avatar";
import { MailMessageViewer } from "~/components/EveMail";
import { characterAttributes } from "~/components/Skills";
import { BloodlineName, RaceName } from "~/components/Text";

export default function Page() {
  const params = useParams();
  const rawBloodlineId = params.bloodlineId;
  const bloodlineId = Number(
    typeof rawBloodlineId === "string" ? rawBloodlineId : rawBloodlineId?.[0],
  );

  const { data: bloodline } = useBloodline(bloodlineId);
  // A bloodline's corvette is its race's.
  const { data: race } = useRace(bloodline?.raceID);
  const shipTypeId = race?.shipTypeID;
  if (!Number.isFinite(bloodlineId)) {
    return null;
  }

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <Title order={3}>
            <BloodlineName bloodlineId={bloodlineId} />
          </Title>
        </Group>
        {bloodline?.description && (
          <MailMessageViewer
            content={
              bloodline.description
                ? sanitizeFormattedEveString(bloodline.description)
                : "No description"
            }
          />
        )}
        <Group justify="space-between">
          <Text>Corporation</Text>
          <Group wrap="nowrap">
            <CorporationAvatar corporationId={bloodline?.corporationID} />
            <CorporationAnchor corporationId={bloodline?.corporationID}>
              <CorporationName corporationId={bloodline?.corporationID} />
            </CorporationAnchor>
          </Group>
        </Group>
        <Group justify="space-between">
          <Text>Race</Text>
          <Group wrap="nowrap">
            <RaceAvatar raceId={bloodline?.raceID} />
            <RaceAnchor raceId={bloodline?.raceID}>
              <RaceName raceId={bloodline?.raceID} />
            </RaceAnchor>
          </Group>
        </Group>
        <Group justify="space-between">
          <Text>Corvette</Text>
          <Group wrap="nowrap">
            <TypeAvatar typeId={shipTypeId} radius="xl" />
            <TypeAnchor typeId={shipTypeId}>
              <TypeName typeId={shipTypeId} />
            </TypeAnchor>
          </Group>
        </Group>
        {bloodline &&
          characterAttributes.map((attributeName) => (
            <Group key={attributeName} justify="space-between">
              <Text>
                {(attributeName as string)
                  .substring(0, 1)
                  .toUpperCase()
                  .concat((attributeName as string).substring(1))}
              </Text>
              <Text>{bloodline[attributeName]}</Text>
            </Group>
          ))}
      </Stack>
    </Container>
  );
}
