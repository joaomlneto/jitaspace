"use client";

import Link from "next/link";
import { Alert, Anchor, Button, Group } from "@mantine/core";

export interface DevelopmentModeAlertProps {}

export const DevelopmentModeAlert = (_props: DevelopmentModeAlertProps) => {
  return (
    <Alert variant="transparent" color="red" title="Development Mode">
      <Group gap="md">
        <Anchor component={Link} href="/debug">
          <Button>Development page</Button>
        </Anchor>
        <Anchor component={Link} href="http://localhost:8288" target="_blank">
          <Button>Inngest UI</Button>
        </Anchor>
        <Anchor component={Link} href="http://localhost:51212" target="_blank">
          <Button>Prisma UI</Button>
        </Anchor>
      </Group>
    </Alert>
  );
};
