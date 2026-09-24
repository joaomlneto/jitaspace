"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  Card,
  Container,
  Group,
  rem,
  Text,
  UnstyledButton,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";

import type { EveIconProps } from "@jitaspace/eve-icons";

import classes from "./SectionLinkCard.module.css";

export interface SectionLinkCardProps {
  href: string;
  Icon: ComponentType<EveIconProps>;
  title: string;
  description: string;
}

/**
 * A card linking to one sub-section, as laid out on the section landing
 * pages (/assets, /contacts, /dogma).
 */
export function SectionLinkCard({
  href,
  Icon,
  title,
  description,
}: Readonly<SectionLinkCardProps>) {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  return (
    <UnstyledButton component={Link} href={href}>
      <Card
        shadow="md"
        radius="md"
        mih={200}
        className={classes.card}
        styles={{
          root: {
            border: `${rem(1)} solid ${
              colorScheme === "dark"
                ? theme.colors.dark[5]
                : theme.colors.gray[1]
            }`,
          },
        }}
        padding="xl"
      >
        <Container m={0} p={0} w={64} h={64}>
          <Icon height={64} width={64} />
        </Container>
        <Group>
          <Text fz="lg" fw={500} className={classes.title} mt="md">
            {title}
          </Text>
        </Group>
        <Text fz="sm" c="dimmed" mt="sm">
          {description}
        </Text>
      </Card>
    </UnstyledButton>
  );
}
