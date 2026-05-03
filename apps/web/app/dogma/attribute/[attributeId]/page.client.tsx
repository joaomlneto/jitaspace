"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  Badge,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";

import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import { TypeAnchor, TypeAvatar } from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";

export interface PageProps {
  attributeId: number;
  title: string | null;
  name: string | null;
  displayName: string | null;
  description: string | null;
  defaultValue: number | null;
  highIsGood: boolean | null;
  published: boolean | null;
  stackable: boolean | null;
  unit: string | null;
  iconId: number | null;
  types: { typeId: number; name: string; value: number; groupId: number }[];
  groups: { groupId: number; name: string }[];
}

export default function DogmaAttributePage({
  attributeId,
  title,
  name,
  displayName,
  description,
  defaultValue,
  highIsGood,
  published,
  stackable,
  unit,
  iconId,
  types,
  groups,
}: PageProps) {
  const groupTypes = useMemo(() => {
    const map: Record<number, (typeof types)[number][]> = {};
    groups.forEach(
      (group) =>
        (map[group.groupId] = types.filter(
          (type) => type.groupId === group.groupId,
        )),
    );
    return map;
  }, [types, groups]);

  const booleanBadge = (value: boolean | null) => (
    <Badge
      color={value === null ? "gray" : value ? "teal" : "red"}
      variant="light"
    >
      {value === null ? "Unknown" : value ? "Yes" : "No"}
    </Badge>
  );

  const details: { label: string; value: ReactNode }[] = [
    { label: "Attribute ID", value: attributeId },
    ...(name ? [{ label: "Name", value: name }] : []),
    ...(displayName ? [{ label: "Display Name", value: displayName }] : []),
    ...(defaultValue !== null
      ? [{ label: "Default Value", value: defaultValue }]
      : []),
    { label: "High is Good", value: booleanBadge(highIsGood) },
    { label: "Published", value: booleanBadge(published) },
    { label: "Stackable", value: booleanBadge(stackable) },
    ...(unit ? [{ label: "Unit", value: unit }] : []),
    ...(iconId !== null ? [{ label: "Icon ID", value: iconId }] : []),
  ];

  return (
    <Container size="md">
      <Stack gap="lg">
        <Group justify="space-between" align="center" wrap="wrap">
          <Title order={2}>{title ?? `Attribute ${attributeId}`}</Title>
          {booleanBadge(published)}
        </Group>

        {description && (
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed" mb="xs">
              Description
            </Text>
            <MailMessageViewer
              content={
                description
                  ? sanitizeFormattedEveString(description)
                  : "No description"
              }
            />
          </Paper>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {details.map((detail) => (
            <Paper key={detail.label} withBorder radius="md" p="sm">
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  {detail.label}
                </Text>
                <Text fw={500}>{detail.value}</Text>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>

        <Title order={4}>Types</Title>
        <Stack gap="xs">
          {groups.map((group) => (
            <Paper key={group.groupId} withBorder radius="md" p="sm">
              <Group justify="space-between" mb="xs">
                <Title order={6}>{group.name}</Title>
                <Badge variant="light">
                  {groupTypes[group.groupId]?.length ?? 0}
                </Badge>
              </Group>

              <Table highlightOnHover>
                <Table.Tbody>
                  {groupTypes[group.groupId]?.map((type) => (
                    <Table.Tr key={type.typeId}>
                      <Table.Td>
                        <Group gap="xs">
                          <TypeAvatar size="sm" typeId={type.typeId} />
                          <TypeAnchor typeId={type.typeId} target="_blank">
                            {type.name}
                          </TypeAnchor>
                        </Group>
                      </Table.Td>
                      <Table.Td align="right">{type.value}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
