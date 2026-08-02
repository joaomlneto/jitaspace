"use client";

import { useQuery } from "@tanstack/react-query";

import { sdeRecordQueryOptions } from "../sde";

/**
 * The agent record for a character, or `null` if the character isn't an agent.
 *
 * Agents are static SDE data held in our `Agent` table, so this single lookup
 * doubles as the "is this character an agent?" test — the previous SDE-API
 * version had to download the full list of NPC character ids to answer that,
 * and a second full list to find out whether the agent was in space.
 */
export const useSdeAgent = (characterId: number) =>
  useQuery(sdeRecordQueryOptions("agent", characterId));
