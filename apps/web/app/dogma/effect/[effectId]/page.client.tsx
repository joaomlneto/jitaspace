"use client";

import { useMemo } from "react";
import {
  Badge,
  Container,
  Group,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";

import { useDogmaEffect } from "@jitaspace/hooks";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import {
  DogmaAttributeAnchor,
  DogmaAttributeName,
  DogmaEffectAnchor,
  DogmaEffectName,
  TypeAnchor,
  TypeAvatar,
  TypeName,
} from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";

export interface PageProps {
  effectId: number;
  name: string | null;
  description: string | null;
  published: boolean | null;
  types: {
    typeId: number;
    name: string;
    isDefault: boolean;
    groupId: number;
  }[];
  modifiers: {
    modifierIndex: number;
    domain: string | null;
    targetEffectId: number | null;
    func: string;
    modifiedAttributeId: number | null;
    modifyingAttributeId: number | null;
    operator: number | null;
    groupId: number | null;
    skillTypeId: number | null;
    isDeleted: boolean;
  }[];
  groups: { groupId: number; name: string }[];
}

export default function DogmaEffectPage({
  effectId,
  name,
  description,
  published,
  types,
  modifiers,
  groups,
}: PageProps) {
  const { data: effect } = useDogmaEffect(effectId);

  const sortedGroups = useMemo(
    () => (groups ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    [groups],
  );

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
          <Title order={3}>{name ?? <i>Unnamed Effect</i>}</Title>
        </Group>
        <MailMessageViewer
          content={sanitizeFormattedEveString(
            description ?? "<i>No description provided</i>",
          )}
        />
        <Group justify="space-between">
          <Text>Effect ID</Text>
          <Text>{effectId}</Text>
        </Group>
        {effect?.data.effect_category !== undefined && (
          <Group justify="space-between">
            <Text>Effect Category ID</Text>
            <Text>{effect.data.effect_category}</Text>
          </Group>
        )}
        {effect?.data.name && (
          <Group justify="space-between">
            <Text>Name</Text>
            <Text>{effect.data.name}</Text>
          </Group>
        )}
        {effect?.data.display_name && (
          <Group justify="space-between">
            <Text>Display Name</Text>
            <Text>{effect.data.display_name}</Text>
          </Group>
        )}
        {effect?.data.discharge_attribute_id && (
          <Group justify="space-between">
            <Text>Discharge Attribute</Text>
            <DogmaAttributeAnchor
              attributeId={effect.data.discharge_attribute_id}
              target="_blank"
            >
              <DogmaAttributeName
                attributeId={effect.data.discharge_attribute_id}
              />
            </DogmaAttributeAnchor>
          </Group>
        )}
        {effect?.data.duration_attribute_id && (
          <Group justify="space-between">
            <Text>Duration Attribute</Text>
            <DogmaAttributeAnchor
              attributeId={effect.data.duration_attribute_id}
              target="_blank"
            >
              <DogmaAttributeName
                attributeId={effect.data.duration_attribute_id}
              />
            </DogmaAttributeAnchor>
          </Group>
        )}
        {effect?.data.falloff_attribute_id && (
          <Group justify="space-between">
            <Text>Falloff Attribute</Text>
            <DogmaAttributeAnchor
              attributeId={effect.data.falloff_attribute_id}
              target="_blank"
            >
              <DogmaAttributeName
                attributeId={effect.data.falloff_attribute_id}
              />
            </DogmaAttributeAnchor>
          </Group>
        )}
        {effect?.data.range_attribute_id && (
          <Group justify="space-between">
            <Text>Range Attribute</Text>
            <DogmaAttributeAnchor
              attributeId={effect.data.range_attribute_id}
              target="_blank"
            >
              <DogmaAttributeName
                attributeId={effect.data.range_attribute_id}
              />
            </DogmaAttributeAnchor>
          </Group>
        )}
        {effect?.data.tracking_speed_attribute_id && (
          <Group justify="space-between">
            <Text>Tracking Speed Attribute</Text>
            <DogmaAttributeAnchor
              attributeId={effect.data.tracking_speed_attribute_id}
              target="_blank"
            >
              <DogmaAttributeName
                attributeId={effect.data.tracking_speed_attribute_id}
              />
            </DogmaAttributeAnchor>
          </Group>
        )}
        <Group justify="space-between">
          <Text>Published</Text>
          <Text>{published ? "Yes" : "No"}</Text>
        </Group>
        {effect?.data.disallow_auto_repeat !== undefined && (
          <Group justify="space-between">
            <Text>Disallow Auto Repeat</Text>
            <Text>{effect.data.disallow_auto_repeat ? "Yes" : "No"}</Text>
          </Group>
        )}
        {effect?.data.electronic_chance !== undefined && (
          <Group justify="space-between">
            <Text>Electronic Chance</Text>
            <Text>{effect.data.electronic_chance ? "Yes" : "No"}</Text>
          </Group>
        )}
        {effect?.data.is_assistance !== undefined && (
          <Group justify="space-between">
            <Text>Is Assistance</Text>
            <Text>{effect.data.is_assistance ? "Yes" : "No"}</Text>
          </Group>
        )}
        {effect?.data.is_offensive !== undefined && (
          <Group justify="space-between">
            <Text>Is Offensive</Text>
            <Text>{effect.data.is_offensive ? "Yes" : "No"}</Text>
          </Group>
        )}
        {effect?.data.is_warp_safe !== undefined && (
          <Group justify="space-between">
            <Text>Is Warp Safe</Text>
            <Text>{effect.data.is_warp_safe ? "Yes" : "No"}</Text>
          </Group>
        )}
        {effect?.data.range_chance !== undefined && (
          <Group justify="space-between">
            <Text>Range Chance</Text>
            <Text>{effect.data.range_chance ? "Yes" : "No"}</Text>
          </Group>
        )}
        {effect?.data.icon_id !== undefined && (
          <Group justify="space-between">
            <Text>Icon ID</Text>
            <Text>{effect.data.icon_id}</Text>
          </Group>
        )}
        {effect?.data.pre_expression !== undefined && (
          <Group justify="space-between">
            <Text>Pre Expression</Text>
            <Text>{effect.data.pre_expression}</Text>
          </Group>
        )}
        {effect?.data.post_expression !== undefined && (
          <Group justify="space-between">
            <Text>Post Expression</Text>
            <Text>{effect.data.post_expression}</Text>
          </Group>
        )}
        <Title order={4}>Modifiers</Title>
        <Table highlightOnHover fz="xs">
          <Table.Tbody>
            {modifiers.map((modifier) => (
              <Table.Tr key={modifier.modifierIndex}>
                <Table.Td>
                  {modifier.groupId && (
                    <Group justify="space-between">
                      <Text>Effect Group ID</Text>
                      <Text>{modifier.groupId}</Text>
                    </Group>
                  )}
                  {modifier.modifyingAttributeId && (
                    <Group justify="space-between">
                      <Text>Modifying Attribute</Text>
                      <DogmaAttributeAnchor
                        attributeId={modifier.modifyingAttributeId}
                        target="_blank"
                      >
                        <DogmaAttributeName
                          attributeId={modifier.modifyingAttributeId}
                        />
                      </DogmaAttributeAnchor>
                    </Group>
                  )}
                  {modifier.modifiedAttributeId && (
                    <Group justify="space-between">
                      <Text>Modified Attribute</Text>
                      <DogmaAttributeAnchor
                        attributeId={modifier.modifiedAttributeId}
                        target="_blank"
                      >
                        <DogmaAttributeName
                          attributeId={modifier.modifiedAttributeId}
                        />
                      </DogmaAttributeAnchor>
                    </Group>
                  )}
                  {modifier.targetEffectId && (
                    <Group justify="space-between">
                      <Text>Target Effect</Text>
                      <DogmaEffectAnchor
                        effectId={modifier.targetEffectId}
                        target="_blank"
                      >
                        <DogmaEffectName effectId={modifier.targetEffectId} />
                      </DogmaEffectAnchor>
                    </Group>
                  )}
                  {modifier.skillTypeId && (
                    <Group justify="space-between">
                      <Text>Skill</Text>
                      <TypeAnchor typeId={modifier.skillTypeId} target="_blank">
                        <TypeName typeId={modifier.skillTypeId} />
                      </TypeAnchor>
                    </Group>
                  )}
                  <Group justify="space-between">
                    <Text>Domain</Text>
                    <Text>{modifier.domain}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Function</Text>
                    <Text>{modifier.func}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Operator</Text>
                    <Text>{modifier.operator}</Text>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <Title order={4}>Types</Title>
        <Stack gap="xs">
          {sortedGroups.map((group) => (
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
                    <Table.Td align="right">
                      {type.isDefault && <Badge size="sm">IS DEFAULT</Badge>}
                    </Table.Td>
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
