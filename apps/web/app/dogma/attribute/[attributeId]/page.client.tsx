"use client";

import { useMemo } from "react";
import { Container, Group, Stack, Table, Text, Title } from "@mantine/core";

import { useDogmaAttribute } from "@jitaspace/hooks";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import { TypeAnchor, TypeAvatar, TypeName } from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";

export interface PageProps {
  attributeId: number;
  name: string | null;
  description: string | null;
  published: boolean | null;
  types: { typeId: number; name: string; value: number; groupId: number }[];
  groups: { groupId: number; name: string }[];
}

export default function DogmaAttributePage({
  attributeId,
  name,
  description,
  published,
  types,
  groups,
}: PageProps) {
  const { data: attribute } = useDogmaAttribute(attributeId);

  const groupTypes = useMemo(() => {
    const map: Record<number, (typeof types)[number][]> = {};
    groups?.forEach(
      (group) =>
        (map[group.groupId] = types.filter(
          (type) => type.groupId === group.groupId,
        )),
    );
    return map;
  }, [types, groups]);

  return (
    <Container size="sm">
      <Stack>
        <Group gap="xl">
          <Title order={3}>{name}</Title>
        </Group>
        {description && (
          <MailMessageViewer
            content={
              description
                ? sanitizeFormattedEveString(description)
                : "No description"
            }
          />
        )}
        <Group justify="space-between">
          <Text>Attribute ID</Text>
          <Text>{attributeId}</Text>
        </Group>
        {attribute?.data.name && (
          <Group justify="space-between">
            <Text>Name</Text>
            <Text>{attribute.data.name}</Text>
          </Group>
        )}
        {attribute?.data.display_name && (
          <Group justify="space-between">
            <Text>Display Name</Text>
            <Text>{attribute.data.display_name}</Text>
          </Group>
        )}
        {attribute?.data.default_value !== undefined && (
          <Group justify="space-between">
            <Text>Default Value</Text>
            <Text>{attribute.data.default_value}</Text>
          </Group>
        )}
        {attribute?.data.high_is_good !== undefined && (
          <Group justify="space-between">
            <Text>High is Good?</Text>
            <Text>{attribute.data.high_is_good ? "Yes" : "No"}</Text>
          </Group>
        )}
        <Group justify="space-between">
          <Text>Published</Text>
          <Text>{published ? "Yes" : "No"}</Text>
        </Group>
        {attribute?.data.stackable !== undefined && (
          <Group justify="space-between">
            <Text>Stackable</Text>
            <Text>{attribute.data.stackable ? "Yes" : "No"}</Text>
          </Group>
        )}
        {attribute?.data.unit_id !== undefined && (
          <Group justify="space-between">
            <Text>Unit ID</Text>
            <Text>{attribute.data.unit_id}</Text>
          </Group>
        )}
        {attribute?.data.icon_id !== undefined && (
          <Group justify="space-between">
            <Text>Icon ID</Text>
            <Text>{attribute.data.icon_id}</Text>
          </Group>
        )}
        <Title order={4}>Types:</Title>
        <Stack gap="xs">
          {groups.map((group) => (
            <div key={group.groupId}>
              <Title order={6} mb={8}>
                {group.name}
              </Title>
              <Table highlightOnHover>
                {groupTypes[group.groupId]?.map((type) => (
                  <Table.Tr key={type.typeId}>
                    <Table.Td>
                      <Group gap="xs">
                        <TypeAvatar size="sm" typeId={type.typeId} />
                        <TypeAnchor typeId={type.typeId} target="_blank">
                          <TypeName typeId={type.typeId} />
                        </TypeAnchor>
                      </Group>
                    </Table.Td>
                    <Table.Td align="right">{type.value}</Table.Td>
                  </Table.Tr>
                ))}
              </Table>
            </div>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
