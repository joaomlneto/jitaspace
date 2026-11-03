import type { ReactNode } from "react";
import { Button, Group, Stack, Text, Title } from "@mantine/core";

import { WindowPlanetsIcon } from "@jitaspace/eve-icons";

import { HoverPrefetchLink } from "~/components/Link";

export const PI_SECTIONS = [
  { id: "colonies", label: "Colonies", href: "/planetary-interaction" },
  {
    id: "customs-offices",
    label: "Customs Offices",
    href: "/planetary-interaction/customs-offices",
  },
  {
    id: "schematics",
    label: "Schematics",
    href: "/planetary-interaction/schematics",
  },
] as const;

export type PiSectionId = (typeof PI_SECTIONS)[number]["id"];

/**
 * The PI pages' title and section links. Each page renders it with its own
 * section, rather than a shared layout reading the path: `usePathname` in a
 * layout is request data under cacheComponents, which would hold the pages
 * out of their static HTML.
 */
export function PiPageHeader({
  active,
  title,
  description,
}: Readonly<{ active: PiSectionId; title: string; description: ReactNode }>) {
  return (
    <Stack gap="sm">
      <Group wrap="nowrap" align="center">
        <WindowPlanetsIcon width={48} height={48} alt="" />
        <Title order={1}>{title}</Title>
      </Group>
      <Text c="dimmed" size="sm">
        {description}
      </Text>
      <nav aria-label="Planetary Interaction sections">
        <Group gap="xs">
          {PI_SECTIONS.map((section) => {
            const isActive = section.id === active;
            return (
              <Button
                key={section.id}
                component={HoverPrefetchLink}
                href={section.href}
                size="xs"
                variant={isActive ? "filled" : "default"}
                aria-current={isActive ? "page" : undefined}
              >
                {section.label}
              </Button>
            );
          })}
        </Group>
      </nav>
    </Stack>
  );
}
