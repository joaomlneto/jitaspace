"use client";

import { ActionIcon, Kbd, Text, UnstyledButton } from "@mantine/core";
import { useOs } from "@mantine/hooks";
import { openSpotlight } from "@mantine/spotlight";
import { IconSearch } from "@tabler/icons-react";

import classes from "./HeaderMenu.module.css";

/**
 * Opens the existing Spotlight (the same one bound to ⌘/Ctrl + K). Responsive:
 * a full input-style box from `lg`, and a compact icon button below it so the
 * bar fits on narrower screens (the labelled nav + wide EVE login button leave
 * no room for the box until `lg`). `useOs()` reports "undetermined" on the server
 * and first client render, resolving the platform only in an effect, so the
 * shortcut hint stays hydration-safe. The box is named by its visible text (no
 * aria-label), so speech-input users can say what they see (WCAG 2.5.3).
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
      >
        <IconSearch size={16} stroke={1.5} />
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
        <IconSearch size={18} stroke={1.5} />
      </ActionIcon>
    </>
  );
}
