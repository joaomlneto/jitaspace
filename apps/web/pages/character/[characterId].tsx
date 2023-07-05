import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import {
  useGetCharactersCharacterId,
  useGetUniverseBloodlines,
  useGetUniverseRaces,
} from "@jitaspace/esi-client";
import {
  AllianceAvatar,
  AllianceName,
  CharacterAvatar,
  CharacterName,
  CorporationAvatar,
  CorporationName,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
import { MailLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const characterId = router.query.characterId as string;
  const { data: character } = useGetCharactersCharacterId(
    parseInt(characterId),
  );
  const { data: bloodlines } = useGetUniverseBloodlines();
  const { data: races } = useGetUniverseRaces();

  const sanitizeCharacterDescriptionString = (str: string): string => {
    // FIXME: IS THIS CORRECT? THIS WILL CONSIDER THAT THE WHOLE EMAIL IS A "UNICODE BLOCK".
    //        THIS MIGHT BREAK BADLY IF MULTIPLE BLOCKS ARE ALLOWED TO EXIST WITHIN THE STRING!
    if (str.startsWith("u'") && str.endsWith("'")) {
      str = str.slice(2, -1);
      str = str.replaceAll(/\\x[0-9a-fA-F]{2}/g, (str) => {
        const charCode = parseInt(str.slice(2), 16);
        return String.fromCharCode(charCode);
      });
      str = str.replaceAll(/\\'/g, "'");
    }
    return str;
  };

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <CharacterAvatar characterId={characterId} size="xl" radius={256} />
          <Title order={3}>
            <CharacterName span characterId={characterId} />
          </Title>
        </Group>
        <Group>
          <Link
            href={`https://evewho.com/character/${characterId}`}
            target="_blank"
          >
            <Button>
              <Group spacing="xs">
                <IconExternalLink size={14} />
                EveWho
              </Group>
            </Button>
          </Link>
          <Link
            href={`https://zkillboard.com/character/${characterId}`}
            target="_blank"
          >
            <Button>
              <Group spacing="xs">
                <IconExternalLink size={14} />
                zKillboard
              </Group>
            </Button>
          </Link>
        </Group>
        {character?.data.corporation_id && (
          <Group position="apart">
            <Text>Corporation</Text>
            <Group>
              <CorporationAvatar
                corporationId={character?.data.corporation_id}
                size="sm"
              />
              <CorporationName corporationId={character?.data.corporation_id} />
            </Group>
          </Group>
        )}
        {character?.data.alliance_id && (
          <Group position="apart">
            <Text>Alliance</Text>
            <Group>
              <AllianceAvatar
                allianceId={character?.data.alliance_id}
                size="sm"
              />
              <AllianceName allianceId={character?.data.alliance_id} />
            </Group>
          </Group>
        )}
        {character?.data.gender && (
          <Group position="apart">
            <Text>Gender</Text>
            <Text>{character?.data.gender === "male" ? "Male" : "Female"}</Text>
          </Group>
        )}
        {character?.data.security_status && (
          <Group position="apart">
            <Text>Security Status</Text>
            <Text>{character?.data.security_status}</Text>
          </Group>
        )}
        <Group position="apart">
          <Text>Birthday</Text>
          <Text>
            {new Date(character?.data.birthday ?? 0).toLocaleString()}
          </Text>
        </Group>
        <Group position="apart">
          <Text>Bloodline</Text>
          <Text>
            {
              bloodlines?.data.find(
                (bloodline) =>
                  bloodline.bloodline_id === character?.data.bloodline_id,
              )?.name
            }
          </Text>
        </Group>
        <Group position="apart">
          <Text>Race</Text>
          <Text>
            {
              races?.data.find(
                (race) => race.race_id === character?.data.race_id,
              )?.name
            }
          </Text>
        </Group>
        {character?.data && (
          <MailMessageViewer
            content={
              character?.data.description
                ? sanitizeCharacterDescriptionString(
                    character?.data.description,
                  )
                : "No description"
            }
          />
        )}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MailLayout>{page}</MailLayout>;
};
