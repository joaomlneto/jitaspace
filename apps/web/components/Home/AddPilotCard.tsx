"use client";

import { Stack, Text, UnstyledButton } from "@mantine/core";
import { openContextModal } from "@mantine/modals";
import { IconPlus } from "@tabler/icons-react";

import classes from "./AddPilotCard.module.css";

export function AddPilotCard() {
  return (
    <UnstyledButton
      className={classes.card}
      onClick={() => {
        openContextModal({
          modal: "login",
          title: "Login",
          size: "xl",
          innerProps: {},
        });
      }}
    >
      <Stack align="center" justify="center" gap={10} h="100%">
        <div className={classes.plus}>
          <IconPlus size={26} stroke={1.5} />
        </div>
        <Text fw={600} tt="uppercase" className={classes.label}>
          Add pilot
        </Text>
        <Text size="xs" c="dimmed" ta="center">
          Sign in with EVE Online SSO
        </Text>
      </Stack>
    </UnstyledButton>
  );
}
