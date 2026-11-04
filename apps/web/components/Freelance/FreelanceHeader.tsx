import type { ReactNode } from "react";
import { Button, Group, Stack, Text, Title } from "@mantine/core";

import { SystemFreelanceProjectsIcon } from "@jitaspace/eve-icons";

import { HoverPrefetchLink } from "~/components/Link";

const SECTIONS = [
  { id: "board", label: "Job board", href: "/freelance" },
  { id: "mine", label: "Your jobs", href: "/freelance/mine" },
] as const;

export type FreelanceSection = (typeof SECTIONS)[number]["id"];

/**
 * The title and section links shared by the freelance pages. The current
 * section is passed in rather than read from the router: `usePathname` would
 * make the static pages request-time (see apps/web/CLAUDE.md).
 */
export function FreelanceHeader({
  current,
  title,
  description,
}: Readonly<{
  current: FreelanceSection;
  title: string;
  description: ReactNode;
}>) {
  return (
    <Stack gap="xs">
      <Group justify="space-between" align="flex-end" gap="md">
        <Group gap="sm" wrap="nowrap">
          <SystemFreelanceProjectsIcon size={32} color="currentColor" alt="" />
          <Title order={1}>{title}</Title>
        </Group>
        <Group gap="xs" component="nav" aria-label="Freelance jobs">
          {SECTIONS.map((section) => {
            const active = section.id === current;
            return (
              <Button
                key={section.id}
                component={HoverPrefetchLink}
                href={section.href}
                size="xs"
                variant={active ? "light" : "subtle"}
                aria-current={active ? "page" : undefined}
              >
                {section.label}
              </Button>
            );
          })}
        </Group>
      </Group>
      <Text c="dimmed" size="sm" maw={720}>
        {description}
      </Text>
    </Stack>
  );
}
