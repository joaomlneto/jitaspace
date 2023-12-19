import React, { type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Anchor,
  Badge,
  Button,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconExternalLink } from "@tabler/icons-react";

import { useCharacter, useSelectedCharacter } from "@jitaspace/hooks";
import { useGetNpcCorporationDivisionById } from "@jitaspace/sde-client";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  AllianceAvatar,
  AllianceName,
  BloodlineName,
  CharacterAvatar,
  CharacterName,
  CorporationAvatar,
  CorporationName,
  FormattedDateText,
  OpenInformationWindowActionIcon,
  RaceName,
  SolarSystemAnchor,
  SolarSystemName,
  StationAnchor,
  StationAvatar,
  StationName,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
import { MainLayout } from "~/layouts";

export default function Page() {
  const router = useRouter();
  const characterId = parseInt(router.query.characterId as string);

  const selectedCharacter = useSelectedCharacter();

  const { data: character } = useCharacter(characterId);

  const { data: agentDivision } = useGetNpcCorporationDivisionById(
    character?.type === "agent" ? character.agentDivisionId : 0,
    { query: { enabled: character?.type === "agent" } },
  );
  if (router.isFallback) {
    return "Loading character";
  }

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <CharacterAvatar characterId={characterId} size="xl" radius={256} />
          <Title order={3}>
            <CharacterName span characterId={characterId} />
          </Title>
          {character?.isNpc && (
            <Badge>
              {character.type === "agent"
                ? character.isResearchAgent
                  ? "Research Agent"
                  : "Agent"
                : "NPC"}
            </Badge>
          )}
          {selectedCharacter && (
            <OpenInformationWindowActionIcon
              characterId={selectedCharacter.characterId}
              entityId={characterId}
            />
          )}
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
        {character?.corporationId && (
          <Group position="apart">
            <Text>Corporation</Text>
            <Group>
              <CorporationAvatar
                corporationId={character?.corporationId}
                size="sm"
              />
              <Anchor
                component={Link}
                href={`/corporation/${character?.corporationId}`}
              >
                <CorporationName
                  span
                  corporationId={character?.corporationId}
                />
              </Anchor>
            </Group>
          </Group>
        )}
        {character?.allianceId && (
          <Group position="apart">
            <Text>Alliance</Text>
            <Group>
              <AllianceAvatar allianceId={character?.allianceId} size="sm" />
              <Anchor
                component={Link}
                href={`/alliance/${character?.allianceId}`}
              >
                <AllianceName span allianceId={character?.allianceId} />
              </Anchor>
            </Group>
          </Group>
        )}
        {character?.gender && (
          <Group position="apart">
            <Text>Gender</Text>
            <Text>{character?.gender === "male" ? "Male" : "Female"}</Text>
          </Group>
        )}
        {character?.securityStatus !== undefined && (
          <Group position="apart">
            <Text>Security Status</Text>
            <Text>{character?.securityStatus}</Text>
          </Group>
        )}
        {character?.birthday && (
          <Group position="apart">
            <Text>Birthday</Text>
            <Text>
              <FormattedDateText date={character.birthday} />
            </Text>
          </Group>
        )}
        <Group position="apart">
          <Text>Bloodline</Text>
          <Anchor
            component={Link}
            href={`/bloodline/${character?.bloodlineId}`}
          >
            <BloodlineName bloodlineId={character?.bloodlineId} />
          </Anchor>
        </Group>
        <Group position="apart">
          <Text>Race</Text>
          <Anchor component={Link} href={`/race/${character?.raceId}`}>
            <RaceName span raceId={character?.raceId} />
          </Anchor>
        </Group>
        {character?.type === "agent" && (
          <>
            <Group position="apart">
              <Text>Agent Division</Text>
              <Text>{agentDivision?.data.nameID.en}</Text>
            </Group>
            <Group position="apart">
              <Text>Agent Type</Text>
              <Text>{character.agentTypeId}</Text>
            </Group>
            <Group position="apart">
              <Text>Is Locator Agent?</Text>
              <Text>{character.isLocator ? "Yes" : "No"}</Text>
            </Group>
            <Group position="apart">
              <Text>Agent Level</Text>
              <Text>{character.level}</Text>
            </Group>
            <Group position="apart">
              <Text>Agent Station</Text>
              <Group noWrap spacing="xs">
                <StationAvatar stationId={character.locationId} size="xs" />
                <StationAnchor stationId={character.locationId} target="_blank">
                  <StationName stationId={character.locationId} />
                </StationAnchor>
              </Group>
            </Group>
            {character.isResearchAgent && (
              <Group position="apart">
                <Text>Research Agent Skills</Text>
                <Stack spacing="xs">
                  {character.researchSkills?.map((typeId) => (
                    <Group noWrap spacing="xs" key={typeId}>
                      <TypeAvatar typeId={typeId} size="xs" />
                      <TypeAnchor typeId={typeId} target="_blank">
                        <TypeName typeId={typeId} />
                      </TypeAnchor>
                    </Group>
                  ))}
                </Stack>
              </Group>
            )}
            {character.isInSpace && (
              <>
                <Group position="apart">
                  <Text>Dungeon</Text>
                  <Text>{character.dungeonId}</Text>
                </Group>
                <Group position="apart">
                  <Text>Spawn Point</Text>
                  <Text>{character.spawnPointId}</Text>
                </Group>
                <Group position="apart">
                  <Text>Solar System</Text>
                  <Group>
                    <SolarSystemAnchor
                      solarSystemId={character.solarSystemId}
                      target="_blank"
                    >
                      <SolarSystemName
                        solarSystemId={character.solarSystemId}
                      />
                    </SolarSystemAnchor>
                  </Group>
                </Group>
                <Group position="apart">
                  <Text>Type</Text>
                  <Group>
                    <TypeAvatar typeId={character.typeId} size="xs" />
                    <TypeAnchor typeId={character.typeId} target="_blank">
                      <TypeName typeId={character.typeId} />
                    </TypeAnchor>
                  </Group>
                </Group>
              </>
            )}
          </>
        )}
        {character && (
          <MailMessageViewer
            content={
              character?.description
                ? sanitizeFormattedEveString(character?.description)
                : "No description"
            }
          />
        )}
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
