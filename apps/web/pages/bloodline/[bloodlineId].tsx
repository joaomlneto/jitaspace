import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Anchor, Container, Group, Stack, Text, Title } from "@mantine/core";

import {
  useGetUniverseBloodlines,
  type GetUniverseBloodlines200Item,
} from "@jitaspace/esi-client";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  BloodlineName,
  CorporationAvatar,
  CorporationName,
  RaceAvatar,
  RaceName,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const bloodlineId = router.query.bloodlineId as string;

  const { data: bloodlines } = useGetUniverseBloodlines();

  const bloodline = bloodlines?.data.find(
    (bloodline) => bloodline.bloodline_id === parseInt(bloodlineId),
  );

  const attributeNames: (keyof GetUniverseBloodlines200Item)[] = [
    "charisma",
    "intelligence",
    "memory",
    "perception",
    "willpower",
  ];

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
        <Group justify="apart">
          <Text>Corporation</Text>
          <Group wrap="nowrap">
            <CorporationAvatar corporationId={bloodline?.corporation_id} />
            <Anchor
              component={Link}
              href={`/corporation/${bloodline?.corporation_id}`}
            >
              <CorporationName corporationId={bloodline?.corporation_id} />
            </Anchor>
          </Group>
        </Group>
        <Group justify="apart">
          <Text>Race</Text>
          <Group wrap="nowrap">
            <RaceAvatar raceId={bloodline?.race_id} />
            <Anchor component={Link} href={`/race/${bloodline?.race_id}`}>
              <RaceName raceId={bloodline?.race_id} />
            </Anchor>
          </Group>
        </Group>
        <Group justify="apart">
          <Text>Corvette</Text>
          <Group wrap="nowrap">
            <TypeAvatar
              typeId={bloodline?.ship_type_id ?? undefined}
              radius="xl"
            />
            <Anchor component={Link} href={`/type/${bloodline?.ship_type_id}`}>
              <TypeName typeId={bloodline?.ship_type_id ?? undefined} />
            </Anchor>
          </Group>
        </Group>
        {bloodline &&
          attributeNames.map((attributeName) => (
            <Group key={attributeName} justify="apart">
              <Text>
                {(attributeName as string)
                  .substring(0, 1)
                  .toUpperCase()
                  .concat((attributeName as string).substring(1))}
              </Text>
              <Text>{bloodline?.[attributeName]}</Text>
            </Group>
          ))}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
