import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Group, Stack, Text } from "@mantine/core";

import {
  AllianceAvatar,
  CalendarEventOwnerAvatar,
  CharacterAvatar,
  CorporationAvatar,
  EveIconAvatar,
  EveIconAvatarPlaceholder,
  EveImageServerAvatar,
  FactionAvatar,
  PlanetAvatar,
  RaceAvatar,
  SolarSystemStarAvatar,
  StarAvatar,
  StargateAvatar,
  StationAvatar,
  StructureAvatar,
  TypeAvatar,
  WarAggressorAvatar,
  WarDefenderAvatar,
} from "@jitaspace/ui";

import { SAMPLE } from "./fixtures";

const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

const meta = {
  title: "Components/Avatar",
  component: CharacterAvatar,
  parameters: {
    docs: {
      description: {
        component:
          "Images from CCP's image server (`images.evetech.net`) and the JitaSpace icon server (`icons.jita.space`). Each avatar takes an id and picks the right category and variation; a missing id renders Mantine's placeholder.",
      },
    },
  },
  args: { characterId: SAMPLE.character.id, size: "xl" },
  argTypes: {
    size: { control: "select", options: SIZES },
  },
} satisfies Meta<typeof CharacterAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Character: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <Group align="end">
      {SIZES.map((size) => (
        <Stack key={size} align="center" gap={4}>
          <CharacterAvatar {...args} size={size} />
          <Text size="xs" c="dimmed">
            {size}
          </Text>
        </Stack>
      ))}
    </Group>
  ),
};

export const Missing: Story = {
  args: { characterId: undefined },
};

const Labelled = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <Stack align="center" gap={4} w={110}>
    {children}
    <Text size="xs" c="dimmed" ta="center">
      {label}
    </Text>
  </Stack>
);

export const Entities: Story = {
  render: () => (
    <Group align="start">
      <Labelled label={SAMPLE.character.name}>
        <CharacterAvatar characterId={SAMPLE.character.id} size="xl" />
      </Labelled>
      <Labelled label={SAMPLE.corporation.name}>
        <CorporationAvatar corporationId={SAMPLE.corporation.id} size="xl" />
      </Labelled>
      <Labelled label={SAMPLE.alliance.name}>
        <AllianceAvatar allianceId={SAMPLE.alliance.id} size="xl" />
      </Labelled>
      <Labelled label={SAMPLE.faction.name}>
        <FactionAvatar factionId={SAMPLE.faction.id} size="xl" />
      </Labelled>
    </Group>
  ),
};

export const Types: Story = {
  render: () => (
    <Group align="start">
      {Object.values(SAMPLE.types).map((type) => (
        <Labelled key={type.id} label={type.name}>
          <TypeAvatar typeId={type.id} size="xl" />
        </Labelled>
      ))}
      <Labelled label="Rifter (render)">
        <TypeAvatar
          typeId={SAMPLE.types.rifter.id}
          variation="render"
          size="xl"
        />
      </Labelled>
      <Labelled label="Unknown type">
        <TypeAvatar size="xl" />
      </Labelled>
    </Group>
  ),
};

export const Universe: Story = {
  render: () => (
    <Group align="start">
      <Labelled label="Star (solar system)">
        <SolarSystemStarAvatar typeId={SAMPLE.jita.starTypeId} size="xl" />
      </Labelled>
      <Labelled label="Star">
        <StarAvatar typeId={SAMPLE.jita.starTypeId} size="xl" />
      </Labelled>
      <Labelled label="Planet">
        <PlanetAvatar typeId={SAMPLE.jita.planetTypeId} size="xl" />
      </Labelled>
      <Labelled label="Stargate">
        <StargateAvatar typeId={SAMPLE.jita.stargateTypeId} size="xl" />
      </Labelled>
      <Labelled label="Station">
        <StationAvatar typeId={SAMPLE.jita.stationTypeId} size="xl" />
      </Labelled>
      <Labelled label={SAMPLE.types.astrahus.name}>
        <StructureAvatar typeId={SAMPLE.types.astrahus.id} size="xl" />
      </Labelled>
      <Labelled label={SAMPLE.types.keepstar.name}>
        <StructureAvatar typeId={SAMPLE.types.keepstar.id} size="xl" />
      </Labelled>
    </Group>
  ),
};

export const Icons: Story = {
  render: () => (
    <Group align="start">
      {[0, 22, 1405, 2512, 3305].map((iconId) => (
        <Labelled key={iconId} label={`Icon ${iconId}`}>
          <EveIconAvatar iconId={iconId} size="xl" />
        </Labelled>
      ))}
      <Labelled label="Placeholder">
        <EveIconAvatarPlaceholder size="xl" />
      </Labelled>
    </Group>
  ),
};

/** A race is shown by its faction's logo. */
export const Races: Story = {
  render: () => (
    <Group align="start">
      {SAMPLE.races.map((race) => (
        <Labelled key={race.factionId} label={race.name}>
          <RaceAvatar factionId={`${race.factionId}`} size="xl" />
        </Labelled>
      ))}
    </Group>
  ),
};

/**
 * The primitive every avatar above is built on: one image-server category and
 * variation, with a 2x `srcSet` sized from the avatar's size.
 */
export const ImageServer: Story = {
  render: () => (
    <Group align="start">
      {(
        [
          ["characters", SAMPLE.character.id, "portrait"],
          ["corporations", SAMPLE.npcCorporation.id, "logo"],
          ["alliances", SAMPLE.alliance.id, "logo"],
          ["types", SAMPLE.types.rifter.id, "icon"],
          ["types", SAMPLE.types.rifter.id, "render"],
          ["types", SAMPLE.types.rifterBlueprint.id, "bp"],
          ["types", SAMPLE.types.rifterBlueprint.id, "bpc"],
        ] as const
      ).map(([category, id, variation]) => (
        <Labelled
          key={`${category}/${id}/${variation}`}
          label={`${category}/${variation}`}
        >
          <EveImageServerAvatar
            category={category}
            id={id}
            variation={variation}
            size="xl"
          />
        </Labelled>
      ))}
    </Group>
  ),
};

export const Wars: Story = {
  render: () => (
    <Group align="start">
      <Labelled label={`Aggressor: ${SAMPLE.war.aggressor.name}`}>
        <WarAggressorAvatar
          aggressorAllianceId={SAMPLE.war.aggressor.allianceId}
          size="xl"
        />
      </Labelled>
      <Labelled label={`Defender: ${SAMPLE.war.defender.name}`}>
        <WarDefenderAvatar
          defenderCorporationId={SAMPLE.war.defender.corporationId}
          size="xl"
        />
      </Labelled>
    </Group>
  ),
};

export const CalendarEventOwners: Story = {
  render: () => (
    <Group align="start">
      <Labelled label="character">
        <CalendarEventOwnerAvatar
          ownerType="character"
          ownerId={SAMPLE.character.id}
          size="lg"
        />
      </Labelled>
      <Labelled label="corporation">
        <CalendarEventOwnerAvatar
          ownerType="corporation"
          ownerId={SAMPLE.corporation.id}
          size="lg"
        />
      </Labelled>
      <Labelled label="alliance">
        <CalendarEventOwnerAvatar
          ownerType="alliance"
          ownerId={SAMPLE.alliance.id}
          size="lg"
        />
      </Labelled>
      <Labelled label="faction">
        <CalendarEventOwnerAvatar
          ownerType="faction"
          ownerId={SAMPLE.faction.id}
          size="lg"
        />
      </Labelled>
      <Labelled label="eve_server">
        <CalendarEventOwnerAvatar
          ownerType="eve_server"
          ownerId={1}
          size="lg"
        />
      </Labelled>
      <Labelled label="loading">
        <CalendarEventOwnerAvatar size="lg" />
      </Labelled>
    </Group>
  ),
};
