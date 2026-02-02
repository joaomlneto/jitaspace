"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Anchor,
  Badge,
  Group,
  Paper,
  Stack,
  Tabs,
  Text,
} from "@mantine/core";

import {
  useCharacter,
  useEsiCharacter,
  useSelectedCharacter,
} from "@jitaspace/hooks";
import { useGetNpcCorporationDivisionById } from "@jitaspace/sde-client";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  AllianceAnchor,
  AllianceAvatar,
  AllianceName,
  BloodlineName,
  CharacterAvatar,
  CharacterName,
  CorporationAnchor,
  CorporationAvatar,
  CorporationName,
  FactionAnchor,
  FactionAvatar,
  FactionName,
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
import classes from "./CharacterShowInfoPanel.module.css";

export type CharacterShowInfoPanelProps = {
  characterId: number;
};

type InfoRowProps = {
  label: string;
  children: ReactNode;
};

const InfoRow = ({ label, children }: InfoRowProps) => {
  return (
    <div className={classes.infoRow}>
      <Text size="xs" c="dimmed" className={classes.infoLabel}>
        {label}
      </Text>
      <div className={classes.infoValue}>{children}</div>
    </div>
  );
};

export function CharacterShowInfoPanel({
  characterId,
}: CharacterShowInfoPanelProps) {
  const { data: character, isLoading } = useCharacter(characterId);
  const esiCharacter = useEsiCharacter(
    characterId,
    {},
    {},
    { query: { enabled: Number.isFinite(characterId) } },
  );
  const selectedCharacter = useSelectedCharacter();

  const esiData = esiCharacter.data?.data;
  const description = esiData?.description?.trim() ?? "";
  const securityStatus =
    esiData?.security_status ?? character?.securityStatus;
  const factionId = esiData?.faction_id ?? character?.factionId;
  const title = esiData?.title ?? character?.title;

  const { data: agentDivision } = useGetNpcCorporationDivisionById(
    character?.type === "agent" ? character.agentDivisionId : 0,
    { query: { enabled: character?.type === "agent" } },
  );

  const showNpcBadge = character?.isNpc ?? false;
  const npcBadgeLabel =
    character?.type === "agent"
      ? character?.isResearchAgent
        ? "Research Agent"
        : "Agent"
      : "NPC";

  return (
    <Paper withBorder radius="md" className={classes.root}>
      <div className={classes.header}>
        <Group
          align="flex-start"
          justify="space-between"
          gap="md"
          className={classes.headerGroup}
        >
          <Group align="flex-start" wrap="nowrap" gap="md">
            <div className={classes.avatarFrame}>
              <CharacterAvatar characterId={characterId} size={96} />
            </div>
            <Stack gap={6} className={classes.headerBody}>
              <Group gap="xs" wrap="nowrap">
                <CharacterName
                  characterId={characterId}
                  size="lg"
                  fw={700}
                  className={classes.name}
                />
                {securityStatus !== undefined && (
                  <Text
                    size="sm"
                    fw={600}
                    className={
                      securityStatus < 0
                        ? classes.securityNegative
                        : classes.securityPositive
                    }
                  >
                    {securityStatus.toFixed(2)}
                  </Text>
                )}
                {showNpcBadge && (
                  <Badge size="sm" variant="light">
                    {npcBadgeLabel}
                  </Badge>
                )}
              </Group>
              {title && (
                <Text size="sm" c="dimmed">
                  {title}
                </Text>
              )}
              <Stack gap={4}>
                {character?.corporationId && (
                  <Group gap="xs" wrap="nowrap">
                    <CorporationAvatar
                      corporationId={character.corporationId}
                      size="sm"
                    />
                    <CorporationAnchor
                      corporationId={character.corporationId}
                      underline="never"
                    >
                      <CorporationName
                        corporationId={character.corporationId}
                        size="sm"
                      />
                    </CorporationAnchor>
                  </Group>
                )}
                {character?.allianceId && (
                  <Group gap="xs" wrap="nowrap">
                    <AllianceAvatar allianceId={character.allianceId} size="sm" />
                    <AllianceAnchor
                      allianceId={character.allianceId}
                      underline="never"
                    >
                      <AllianceName
                        allianceId={character.allianceId}
                        size="sm"
                      />
                    </AllianceAnchor>
                  </Group>
                )}
                {factionId && (
                  <Group gap="xs" wrap="nowrap">
                    <FactionAvatar factionId={factionId} size="sm" />
                    <FactionAnchor factionId={factionId} underline="never">
                      <FactionName factionId={factionId} size="sm" />
                    </FactionAnchor>
                  </Group>
                )}
              </Stack>
            </Stack>
          </Group>
          {selectedCharacter && (
            <OpenInformationWindowActionIcon
              characterId={selectedCharacter.characterId}
              entityId={characterId}
            />
          )}
        </Group>
      </div>

      <Tabs defaultValue="details" className={classes.tabs}>
        <Tabs.List className={classes.tabList}>
          <Tabs.Tab value="details">Details</Tabs.Tab>
          <Tabs.Tab value="bio">Bio</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="details">
          {!character && isLoading && (
            <Text size="sm" c="dimmed">
              Loading character details...
            </Text>
          )}
          {!character && !isLoading && (
            <Text size="sm" c="dimmed">
              Character details not available.
            </Text>
          )}
          {character && (
            <Stack gap="md">
              <div>
                <Text className={classes.sectionTitle}>Identity</Text>
                <Stack gap="xs">
                  <InfoRow label="Character ID">
                    <Text size="sm">{characterId}</Text>
                  </InfoRow>
                  {character.gender && (
                    <InfoRow label="Gender">
                      <Text size="sm">
                        {character.gender === "male" ? "Male" : "Female"}
                      </Text>
                    </InfoRow>
                  )}
                  {securityStatus !== undefined && (
                    <InfoRow label="Security Status">
                      <Text
                        size="sm"
                        className={
                          securityStatus < 0
                            ? classes.securityNegative
                            : classes.securityPositive
                        }
                      >
                        {securityStatus.toFixed(2)}
                      </Text>
                    </InfoRow>
                  )}
                  {character.birthday && (
                    <InfoRow label="Birthday">
                      <FormattedDateText date={character.birthday} size="sm" />
                    </InfoRow>
                  )}
                  <InfoRow label="Bloodline">
                    {character.bloodlineId ? (
                      <Anchor
                        component={Link}
                        href={`/bloodline/${character.bloodlineId}`}
                        underline="never"
                      >
                        <BloodlineName
                          span
                          bloodlineId={character.bloodlineId}
                        />
                      </Anchor>
                    ) : (
                      <Text size="sm" c="dimmed">
                        Unknown
                      </Text>
                    )}
                  </InfoRow>
                  <InfoRow label="Race">
                    {character.raceId ? (
                      <Anchor
                        component={Link}
                        href={`/race/${character.raceId}`}
                        underline="never"
                      >
                        <RaceName span raceId={character.raceId} />
                      </Anchor>
                    ) : (
                      <Text size="sm" c="dimmed">
                        Unknown
                      </Text>
                    )}
                  </InfoRow>
                </Stack>
              </div>

              <div>
                <Text className={classes.sectionTitle}>Affiliation</Text>
                <Stack gap="xs">
                  {character.corporationId ? (
                    <InfoRow label="Corporation">
                      <Group gap="xs" wrap="nowrap">
                        <CorporationAvatar
                          corporationId={character.corporationId}
                          size="xs"
                        />
                        <CorporationAnchor
                          corporationId={character.corporationId}
                          underline="never"
                        >
                          <CorporationName
                            span
                            corporationId={character.corporationId}
                          />
                        </CorporationAnchor>
                      </Group>
                    </InfoRow>
                  ) : (
                    <InfoRow label="Corporation">
                      <Text size="sm" c="dimmed">
                        Unknown
                      </Text>
                    </InfoRow>
                  )}
                  {character.allianceId && (
                    <InfoRow label="Alliance">
                      <Group gap="xs" wrap="nowrap">
                        <AllianceAvatar
                          allianceId={character.allianceId}
                          size="xs"
                        />
                        <AllianceAnchor
                          allianceId={character.allianceId}
                          underline="never"
                        >
                          <AllianceName span allianceId={character.allianceId} />
                        </AllianceAnchor>
                      </Group>
                    </InfoRow>
                  )}
                  {factionId && (
                    <InfoRow label="Faction">
                      <Group gap="xs" wrap="nowrap">
                        <FactionAvatar factionId={factionId} size="xs" />
                        <FactionAnchor factionId={factionId} underline="never">
                          <FactionName span factionId={factionId} />
                        </FactionAnchor>
                      </Group>
                    </InfoRow>
                  )}
                </Stack>
              </div>

              {character.type === "agent" && (
                <div>
                  <Text className={classes.sectionTitle}>Agent</Text>
                  <Stack gap="xs">
                    <InfoRow label="Division">
                      <Text size="sm">
                        {agentDivision?.data.nameID.en ?? "Unknown"}
                      </Text>
                    </InfoRow>
                    <InfoRow label="Agent Type">
                      <Text size="sm">{character.agentTypeId}</Text>
                    </InfoRow>
                    <InfoRow label="Level">
                      <Text size="sm">{character.level}</Text>
                    </InfoRow>
                    <InfoRow label="Locator">
                      <Text size="sm">{character.isLocator ? "Yes" : "No"}</Text>
                    </InfoRow>
                    <InfoRow label="Station">
                      <Group gap="xs" wrap="nowrap">
                        <StationAvatar stationId={character.locationId} size="xs" />
                        <StationAnchor
                          stationId={character.locationId}
                          underline="never"
                        >
                          <StationName stationId={character.locationId} />
                        </StationAnchor>
                      </Group>
                    </InfoRow>
                    {character.isResearchAgent &&
                      character.researchSkills &&
                      character.researchSkills.length > 0 && (
                        <InfoRow label="Research Skills">
                          <Stack gap={4}>
                            {character.researchSkills.map((typeId) => (
                              <Group gap="xs" wrap="nowrap" key={typeId}>
                                <TypeAvatar typeId={typeId} size="xs" />
                                <TypeAnchor typeId={typeId} underline="never">
                                  <TypeName typeId={typeId} />
                                </TypeAnchor>
                              </Group>
                            ))}
                          </Stack>
                        </InfoRow>
                      )}
                    {character.isInSpace && (
                      <>
                        <InfoRow label="Dungeon">
                          <Text size="sm">{character.dungeonId}</Text>
                        </InfoRow>
                        <InfoRow label="Spawn Point">
                          <Text size="sm">{character.spawnPointId}</Text>
                        </InfoRow>
                        <InfoRow label="Solar System">
                          <SolarSystemAnchor
                            solarSystemId={character.solarSystemId}
                            underline="never"
                          >
                            <SolarSystemName
                              solarSystemId={character.solarSystemId}
                            />
                          </SolarSystemAnchor>
                        </InfoRow>
                        <InfoRow label="Type">
                          <Group gap="xs" wrap="nowrap">
                            <TypeAvatar typeId={character.typeId} size="xs" />
                            <TypeAnchor typeId={character.typeId} underline="never">
                              <TypeName typeId={character.typeId} />
                            </TypeAnchor>
                          </Group>
                        </InfoRow>
                      </>
                    )}
                  </Stack>
                </div>
              )}
            </Stack>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="bio">
          {description ? (
            <div className={classes.description}>
              <MailMessageViewer
                content={sanitizeFormattedEveString(description)}
              />
            </div>
          ) : (
            <Text size="sm" c="dimmed">
              {esiCharacter.isLoading
                ? "Loading biography..."
                : "No biography available."}
            </Text>
          )}
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}
