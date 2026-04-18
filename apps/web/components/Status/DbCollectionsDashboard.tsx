"use client";

import {
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useLiveQuery } from "@tanstack/react-db";

import * as db from "@jitaspace/hooks";

interface CollectionStatsProps {
  name: string;
  collection: any;
}

function CollectionStats({ name, collection }: CollectionStatsProps) {
  const { data: items } = useLiveQuery((q) =>
    q.from({ c: collection }).select(({ c }) => c),
  );
  const count = items?.length ?? 0;

  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" fw={500}>
          {name}
        </Text>
      </Table.Td>
      <Table.Td align="right">
        <Badge variant="light" color={count > 0 ? "blue" : "gray"}>
          {count.toLocaleString()}
        </Badge>
      </Table.Td>
    </Table.Tr>
  );
}

export function DbCollectionsDashboard() {
  const collections = [
    { name: "Characters", collection: db.charactersCollection },
    { name: "Market Groups", collection: db.marketGroupsCollection },
    { name: "Categories", collection: db.categoriesCollection },
    { name: "Groups", collection: db.groupsCollection },
    { name: "Types", collection: db.typesCollection },
    { name: "Dogma Attributes", collection: db.dogmaAttributesCollection },
    { name: "Dogma Effects", collection: db.dogmaEffectsCollection },
    { name: "Dogma Units", collection: db.dogmaUnitsCollection },
    { name: "Alliances", collection: db.alliancesCollection },
    { name: "Corporations", collection: db.corporationsCollection },
    { name: "Factions", collection: db.factionsCollection },
    { name: "Stations", collection: db.stationsCollection },
    { name: "Races", collection: db.racesCollection },
    { name: "Regions", collection: db.regionsCollection },
    { name: "Constellations", collection: db.constellationsCollection },
    { name: "Solar Systems", collection: db.solarSystemsCollection },
    { name: "Stars", collection: db.starsCollection },
    { name: "Stargates", collection: db.stargatesCollection },
    { name: "Planets", collection: db.planetsCollection },
    { name: "Moons", collection: db.moonsCollection },
    { name: "Asteroid Belts", collection: db.asteroidBeltsCollection },
    { name: "Ancestries", collection: db.ancestriesCollection },
    { name: "Bloodlines", collection: db.bloodlinesCollection },
    {
      name: "Loyalty Store Offers",
      collection: db.loyaltyStoreOffersCollection,
    },
    { name: "Killmails", collection: db.killmailsCollection },
    { name: "Agents", collection: db.agentsCollection },
  ];

  // Split collections into two columns for the dashboard
  const midpoint = Math.ceil(collections.length / 2);
  const leftColumn = collections.slice(0, midpoint);
  const rightColumn = collections.slice(midpoint);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={3}>Client-side Database Stores</Title>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Paper withBorder p="md" shadow="xs">
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Collection</Table.Th>
                <Table.Th align="right">Entries</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {leftColumn.map((col) => (
                <CollectionStats
                  key={col.name}
                  name={col.name}
                  collection={col.collection}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Paper>

        <Paper withBorder p="md" shadow="xs">
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Collection</Table.Th>
                <Table.Th align="right">Entries</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rightColumn.map((col) => (
                <CollectionStats
                  key={col.name}
                  name={col.name}
                  collection={col.collection}
                />
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
