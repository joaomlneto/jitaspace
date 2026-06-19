"use client";

import type { ReactNode } from "react";
import { Group, Title } from "@mantine/core";

import classes from "./SectionHeader.module.css";

export interface SectionHeaderProps {
  title: string;
  /** Optional count rendered as a monospace chip next to the title. */
  count?: number;
  /** Optional control rendered on the far right (e.g. a button). */
  action?: ReactNode;
}

export function SectionHeader({ title, count, action }: SectionHeaderProps) {
  return (
    <Group
      justify="space-between"
      align="center"
      wrap="nowrap"
      gap="md"
      className={classes.header}
    >
      <Group
        gap="sm"
        align="center"
        wrap="nowrap"
        style={{ flex: 1, minWidth: 0 }}
      >
        <span className={classes.bar} aria-hidden />
        <Title order={3} className={classes.title}>
          {title}
        </Title>
        {count != null && <span className={classes.count}>{count}</span>}
        <span className={classes.rule} aria-hidden />
      </Group>
      {action}
    </Group>
  );
}
