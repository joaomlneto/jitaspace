"use client";

import { ActionIcon, Kbd, Text, UnstyledButton } from "@mantine/core";
import { useOs } from "@mantine/hooks";
import { openSpotlight } from "@mantine/spotlight";

import { SystemSearchIcon } from "@jitaspace/eve-icons";

import classes from "./HeaderMenu.module.css";

/**
 * Opens the existing Spotlight (the same one bound to ⌘/Ctrl + K). Responsive:
 * a full input-style box from `lg`, and a compact icon button below it so the
 * bar fits on narrower screens (the labelled nav + wide EVE login button leave
 * no room for the box until `lg`). `useOs()` reports "undetermined" on the server
 * and first client render, resolving the platform only in an effect, so the
 * shortcut hint stays hydration-safe.
 */
export function HeaderSearchButton() {
  const os = useOs();
  const modKey = os === "macos" ? "⌘" : "Ctrl";

  return (
    <>
      <UnstyledButton
        className={classes.search}
        visibleFrom="lg"
        onClick={() => openSpotlight()}
        aria-label="Search New Eden"
      >
        <SystemSearchIcon size={16} color="currentColor" alt="" />
        <Text className={classes.searchLabel} size="sm">
          Search New Eden…
        </Text>
        <Kbd className={classes.searchKbd}>{modKey} K</Kbd>
      </UnstyledButton>
      <ActionIcon
        className={classes.searchIcon}
        variant="default"
        size="lg"
        radius="sm"
        hiddenFrom="lg"
        onClick={() => openSpotlight()}
        aria-label="Search New Eden"
      >
        <SystemSearchIcon size={18} color="currentColor" alt="" />
      </ActionIcon>
    </>
  );
}
