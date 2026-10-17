"use client";

import { Alert, Anchor, Button, Group } from "@mantine/core";

import { HoverPrefetchLink } from "~/components/Link";

export type DevelopmentModeAlertProps = Record<string, never>;

export const DevelopmentModeAlert = (_props: DevelopmentModeAlertProps) => {
  return (
    <Alert variant="transparent" color="red" title="Development Mode">
      <Group gap="md">
        <Anchor component={HoverPrefetchLink} href="/debug">
          <Button>Development page</Button>
        </Anchor>
        <Anchor
          component={HoverPrefetchLink}
          href="http://localhost:51212"
          target="_blank"
        >
          <Button>Prisma UI</Button>
        </Anchor>
      </Group>
    </Alert>
  );
};
