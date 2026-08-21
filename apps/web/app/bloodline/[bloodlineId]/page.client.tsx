"use client";

import { useParams } from "next/navigation";
import { Container, Group, Stack, Text, Title } from "@mantine/core";

import {
  CorporationName,
  TypeAnchor,
  TypeName,
} from "@jitaspace/eve-components";
import { useBloodline } from "@jitaspace/hooks";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  CorporationAnchor,
  CorporationAvatar,
  RaceAnchor,
  TypeAvatar,
} from "@jitaspace/ui";

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
            <CorporationAvatar corporationId={bloodline?.corporation_id} />
            <CorporationAnchor corporationId={bloodline?.corporation_id}>
              <CorporationName corporationId={bloodline?.corporation_id} />
            </CorporationAnchor>
          </Group>
        </Group>
        <Group justify="space-between">
          <Text>Race</Text>
          <Group wrap="nowrap">
            <RaceAvatar raceId={bloodline?.race_id} />
            <RaceAnchor raceId={bloodline?.race_id}>
              <RaceName raceId={bloodline?.race_id} />
            </RaceAnchor>
          </Group>
        </Group>
        <Group justify="space-between">
          <Text>Corvette</Text>
          <Group wrap="nowrap">
            <TypeAvatar
              typeId={bloodline?.ship_type_id ?? undefined}
              radius="xl"
            />
            <TypeAnchor typeId={bloodline?.ship_type_id ?? undefined}>
              <TypeName typeId={bloodline?.ship_type_id ?? undefined} />
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
