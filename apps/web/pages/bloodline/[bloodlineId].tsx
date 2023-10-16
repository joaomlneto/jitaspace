import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Anchor, Container, Group, Stack, Text, Title } from "@mantine/core";

import {
  useGetUniverseBloodlines,
  type GetUniverseBloodlinesQueryResponse,
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
import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const bloodlineId = router.query.bloodlineId as string;

  const { data: bloodlines } = useGetUniverseBloodlines();

  const bloodline = bloodlines?.data.find(
    (bloodline) => bloodline.bloodline_id === parseInt(bloodlineId),
  );

  const attributeNames: (keyof GetUniverseBloodlinesQueryResponse[number])[] = [
    "charisma",
    "intelligence",
    "memory",
    "perception",
    "willpower",
  ];

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
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
        <Group position="apart">
          <Text>Corporation</Text>
          <Group noWrap>
            <CorporationAvatar corporationId={bloodline?.corporation_id} />
            <Anchor
              component={Link}
              href={`/corporation/${bloodline?.corporation_id}`}
            >
              <CorporationName corporationId={bloodline?.corporation_id} />
            </Anchor>
          </Group>
        </Group>
        <Group position="apart">
          <Text>Race</Text>
          <Group noWrap>
            <RaceAvatar raceId={bloodline?.race_id} />
            <Anchor component={Link} href={`/race/${bloodline?.race_id}`}>
              <RaceName raceId={bloodline?.race_id} />
            </Anchor>
          </Group>
        </Group>
        <Group position="apart">
          <Text>Corvette</Text>
          <Group noWrap>
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
            <Group key={attributeName} position="apart">
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
  return <MainLayout>{page}</MainLayout>;
};
