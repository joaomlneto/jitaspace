import React, { useMemo, type ReactElement } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import {
  Badge,
  Container,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";

import { prisma } from "@jitaspace/db";
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
import { MainLayout } from "~/layouts";


type PageProps = {
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
};

export const getStaticPaths: GetStaticPaths = async () => {
  // Do not pre-render any static pages - faster builds, but slower initial page load
  return {
    paths: [],
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps<PageProps> = async (context) => {
  try {
    const effectId = Number(context.params?.effectId as string);

    const effect = await prisma.dogmaEffect.findUniqueOrThrow({
      select: {
        effectId: true,
        name: true,
        displayName: true,
        description: true,
        published: true,
        TypeEffect: {
          select: {
            type: {
              select: {
                typeId: true,
                name: true,
                groupId: true,
              },
            },
            isDefault: true,
          },
        },
        DogmaEffectModifiers: {
          select: {
            modifierIndex: true,
            domain: true,
            targetEffectId: true,
            func: true,
            modifiedAttributeId: true,
            modifyingAttributeId: true,
            operator: true,
            groupId: true,
            skillTypeId: true,
            isDeleted: true,
          },
          orderBy: {
            modifierIndex: "asc",
          },
        },
      },
      where: {
        effectId: effectId,
      },
    });

    const groupIds = [
      ...new Set(effect.TypeEffect.map((type) => type.type.groupId)),
    ];
    const groups = await prisma.group.findMany({
      select: {
        groupId: true,
        name: true,
      },
      where: {
        groupId: {
          in: groupIds,
        },
      },
    });

    return {
      props: {
        // We use || instead of ?? due to display_name and description being empty strings
        // When they are empty strings, we want to use a fallback value
        name: effect.displayName || effect.name || null,
        description: effect.description || null,
        published: effect.published ?? null,
        modifiers: effect.DogmaEffectModifiers,
        types: effect.TypeEffect.map((entry) => ({
          ...entry.type,
          isDefault: entry.isDefault,
        })),
        groups,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 900, // every 15 minutes
    };
  }
};

export default function Page({
  name,
  description,
  published,
  modifiers,
  types,
  groups,
}: PageProps) {
  const router = useRouter();
  const effectId = Number(router.query.effectId as string);

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

  if (router.isFallback) {
    return (
      <Container size="sm">
        <Group>
          <Loader />
          <Text>Loading effect information...</Text>
        </Group>
      </Container>
    );
  }

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
          <Title order={3}>{name ?? <i>Unnamed Effect</i>}</Title>
        </Group>
        <MailMessageViewer
          content={sanitizeFormattedEveString(
            description ?? "<i>No description provided</i>",
          )}
        />
        <Group position="apart">
          <Text>Effect ID</Text>
          <Text>{effectId}</Text>
        </Group>
        {effect?.data.effect_category !== undefined && (
          <Group position="apart">
            <Text>Effect Category ID</Text>
            <Text>{effect.data.effect_category}</Text>
          </Group>
        )}
        {effect?.data.name && (
          <Group position="apart">
            <Text>Name</Text>
            <Text>{effect.data.name}</Text>
          </Group>
        )}
        {effect?.data.display_name && (
          <Group position="apart">
            <Text>Display Name</Text>
            <Text>{effect.data.display_name}</Text>
          </Group>
        )}
        {effect?.data.discharge_attribute_id && (
          <Group position="apart">
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
          <Group position="apart">
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
          <Group position="apart">
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
          <Group position="apart">
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
          <Group position="apart">
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
        <Group position="apart">
          <Text>Published</Text>
          <Text>{published ? "Yes" : "No"}</Text>
        </Group>
        {effect?.data.disallow_auto_repeat !== undefined && (
          <Group position="apart">
            <Text>Disallow Auto Repeat</Text>
            <Text>{effect.data.disallow_auto_repeat ? "Yes" : "No"}</Text>
          </Group>
        )}
        {effect?.data.electronic_chance !== undefined && (
          <Group position="apart">
            <Text>Electronic Chance</Text>
            <Text>{effect.data.electronic_chance ? "Yes" : "No"}</Text>
          </Group>
        )}
        {effect?.data.is_assistance !== undefined && (
          <Group position="apart">
            <Text>Is Assistance</Text>
            <Text>{effect.data.is_assistance ? "Yes" : "No"}</Text>
          </Group>
        )}
        {effect?.data.is_offensive !== undefined && (
          <Group position="apart">
            <Text>Is Offensive</Text>
            <Text>{effect.data.is_offensive ? "Yes" : "No"}</Text>
          </Group>
        )}
        {effect?.data.is_warp_safe !== undefined && (
          <Group position="apart">
            <Text>Is Warp Safe</Text>
            <Text>{effect.data.is_warp_safe ? "Yes" : "No"}</Text>
          </Group>
        )}
        {effect?.data.range_chance !== undefined && (
          <Group position="apart">
            <Text>Range Chance</Text>
            <Text>{effect.data.range_chance ? "Yes" : "No"}</Text>
          </Group>
        )}
        {effect?.data.icon_id !== undefined && (
          <Group position="apart">
            <Text>Icon ID</Text>
            <Text>{effect.data.icon_id}</Text>
          </Group>
        )}
        {effect?.data.pre_expression !== undefined && (
          <Group position="apart">
            <Text>Pre Expression</Text>
            <Text>{effect.data.pre_expression}</Text>
          </Group>
        )}
        {effect?.data.post_expression !== undefined && (
          <Group position="apart">
            <Text>Post Expression</Text>
            <Text>{effect.data.post_expression}</Text>
          </Group>
        )}
        <Title order={4}>Modifiers</Title>
        <Table highlightOnHover fontSize="xs">
          <tbody>
            {modifiers.map((modifier) => (
              <tr key={modifier.modifierIndex}>
                <td>
                  {modifier.groupId && (
                    <Group position="apart">
                      <Text>Effect Group ID</Text>
                      <Text>{modifier.groupId}</Text>
                    </Group>
                  )}
                  {modifier.modifyingAttributeId && (
                    <Group position="apart">
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
                    <Group position="apart">
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
                    <Group position="apart">
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
                    <Group position="apart">
                      <Text>Skill</Text>
                      <TypeAnchor typeId={modifier.skillTypeId} target="_blank">
                        <TypeName typeId={modifier.skillTypeId} />
                      </TypeAnchor>
                    </Group>
                  )}
                  <Group position="apart">
                    <Text>Domain</Text>
                    <Text>{modifier.domain}</Text>
                  </Group>
                  <Group position="apart">
                    <Text>Function</Text>
                    <Text>{modifier.func}</Text>
                  </Group>
                  <Group position="apart">
                    <Text>Operator</Text>
                    <Text>{modifier.operator}</Text>
                  </Group>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Title order={4}>Types</Title>
        <Stack spacing="xs">
          {sortedGroups.map((group) => (
            <div key={group.groupId}>
              <Title order={6} mb={8}>
                {group.name}
              </Title>
              <Table highlightOnHover>
                {groupTypes[group.groupId]?.map((type) => (
                  <tr key={type.typeId}>
                    <td>
                      <Group spacing="xs">
                        <TypeAvatar size="sm" typeId={type.typeId} />
                        <TypeAnchor typeId={type.typeId} target="_blank">
                          <TypeName typeId={type.typeId} />
                        </TypeAnchor>
                      </Group>
                    </td>
                    <td align="right">
                      {type.isDefault && <Badge size="sm">IS DEFAULT</Badge>}
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}

Page.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};
