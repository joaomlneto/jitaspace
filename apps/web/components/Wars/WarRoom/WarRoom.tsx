"use client";

import { Container } from "@mantine/core";

import type { WarRoomData } from "./types";
import { Belligerents } from "./Belligerents";
import { StatHeader } from "./StatHeader";
import { WarList } from "./WarList";
import classes from "./WarRoom.module.css";

export function WarRoom({ data }: { data: WarRoomData }) {
  const { stats, wars, topAggressors } = data;

  return (
    <Container size="lg" py="md" className={classes.root}>
      <header className={classes.masthead}>
        <h1 className={classes.title}>Active Wars</h1>
        <span className={classes.subtitle}>
          {stats.totalActive.toLocaleString()} ongoing across New Eden
        </span>
      </header>

      <StatHeader stats={stats} />

      <div className={classes.section}>
        <Belligerents aggressors={topAggressors} wars={wars} />
      </div>

      <WarList wars={wars} />
    </Container>
  );
}
