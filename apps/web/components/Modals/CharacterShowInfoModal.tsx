"use client";

import type { ContextModalProps } from "@mantine/modals";

import { CharacterShowInfoPanel } from "~/components/Character";

export function CharacterShowInfoModal({
  innerProps,
}: ContextModalProps<{ characterId: number }>) {
  return <CharacterShowInfoPanel characterId={innerProps.characterId} />;
}
