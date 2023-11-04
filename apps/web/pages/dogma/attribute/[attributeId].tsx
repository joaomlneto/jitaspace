import React, { useMemo, type ReactElement } from "react";
import { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import {
  Container,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";

import { prisma } from "@jitaspace/db";
import { useDogmaAttribute } from "@jitaspace/hooks";
import { sanitizeFormattedEveString } from "@jitaspace/tiptap-eve";
import { TypeAnchor, TypeAvatar, TypeName } from "@jitaspace/ui";

import { MailMessageViewer } from "~/components/EveMail";
import { MainLayout } from "~/layouts";


type PageProps = {
  name: string | null;
  description: string | null;
  published: boolean | null;
  types: { typeId: number; name: string; value: number; groupId: number }[];
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
    const attributeId = Number(context.params?.attributeId as string);

    const attribute = await prisma.dogmaAttribute.findUniqueOrThrow({
      select: {
        attributeId: true,
        name: true,
        displayName: true,
        description: true,
        published: true,
        TypeAttributes: {
          select: {
            type: {
              select: {
                typeId: true,
                name: true,
                groupId: true,
              },
            },
            value: true,
          },
        },
      },
      where: {
        attributeId: attributeId,
      },
    });

    const groupIds = [
      ...new Set(attribute.TypeAttributes.map((type) => type.type.groupId)),
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
      orderBy: {
        name: "asc",
      },
    });

    return {
      props: {
        name: attribute.displayName ?? attribute.name ?? null,
        description: attribute.description,
        published: attribute.published,
        types: attribute.TypeAttributes.map((entry) => ({
          ...entry.type,
          value: entry.value,
        })),
        groups,
      },
      revalidate: 24 * 3600, // every 24 hours
    };
  } catch (e) {
    return {
      notFound: true,
      revalidate: 3600, // every hour
    };
  }
};

export default function Page({
  name,
  description,
  published,
  types,
  groups,
}: PageProps) {
  const router = useRouter();
  const attributeId = Number(router.query.attributeId as string);

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

  if (router.isFallback) {
    return (
      <Container size="sm">
        <Group>
          <Loader />
          <Text>Loading attribute information...</Text>
        </Group>
      </Container>
    );
  }

  return (
    <Container size="sm">
      <Stack>
        <Group spacing="xl">
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
        <Group position="apart">
          <Text>Attribute ID</Text>
          <Text>{attributeId}</Text>
        </Group>
        {attribute?.data.name && (
          <Group position="apart">
            <Text>Name</Text>
            <Text>{attribute.data.name}</Text>
          </Group>
        )}
        {attribute?.data.display_name && (
          <Group position="apart">
            <Text>Display Name</Text>
            <Text>{attribute.data.display_name}</Text>
          </Group>
        )}
        {attribute?.data.default_value !== undefined && (
          <Group position="apart">
            <Text>Default Value</Text>
            <Text>{attribute.data.default_value}</Text>
          </Group>
        )}
        {attribute?.data.high_is_good !== undefined && (
          <Group position="apart">
            <Text>High is Good?</Text>
            <Text>{attribute.data.high_is_good ? "Yes" : "No"}</Text>
          </Group>
        )}
        <Group position="apart">
          <Text>Published</Text>
          <Text>{published ? "Yes" : "No"}</Text>
        </Group>
        {attribute?.data.stackable !== undefined && (
          <Group position="apart">
            <Text>Stackable</Text>
            <Text>{attribute.data.stackable ? "Yes" : "No"}</Text>
          </Group>
        )}
        {attribute?.data.unit_id !== undefined && (
          <Group position="apart">
            <Text>Unit ID</Text>
            <Text>{attribute.data.unit_id}</Text>
          </Group>
        )}
        {attribute?.data.icon_id !== undefined && (
          <Group position="apart">
            <Text>Icon ID</Text>
            <Text>{attribute.data.icon_id}</Text>
          </Group>
        )}
        <Title order={4}>Types:</Title>
        <Stack spacing="xs">
          {groups.map((group) => (
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
                    <td align="right">{type.value}</td>
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
