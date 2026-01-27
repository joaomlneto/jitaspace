import type { ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Anchor, Container, Group, Stack, Text, Title } from "@mantine/core";

import { useBloodline } from "@jitaspace/hooks";
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
import { characterAttributes } from "~/components/Skills";
import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const bloodlineId = parseInt(router.query.bloodlineId as string);

  const { data: bloodline } = useBloodline(bloodlineId);

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
            <Anchor
              component={Link}
              href={`/corporation/${bloodline?.corporation_id}`}
            >
              <CorporationName corporationId={bloodline?.corporation_id} />
            </Anchor>
          </Group>
        </Group>
        <Group justify="space-between">
          <Text>Race</Text>
          <Group wrap="nowrap">
            <RaceAvatar raceId={bloodline?.race_id} />
            <Anchor component={Link} href={`/race/${bloodline?.race_id}`}>
              <RaceName raceId={bloodline?.race_id} />
            </Anchor>
          </Group>
        </Group>
        <Group justify="space-between">
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
          characterAttributes.map((attributeName) => (
            <Group key={attributeName} justify="space-between">
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
