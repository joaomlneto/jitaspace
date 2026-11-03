"use client";

import {
  ESI_CURSOR_PAGE_LIMIT,
  getCharactersMilitaryCampaignsObjectivesListing,
  getCharactersMilitaryCampaignsObjectivesListingQueryKey,
} from "@jitaspace/esi-client";

import { defineMultiEsiQuery, esiCursorQueryOptions } from "../multi";

/**
 * Every military campaign objective each signed-in character has taken part
 * in, flattened and tagged with the character's id.
 *
 * Hand-wired rather than generated: the endpoint pages by cursor, which the
 * multi-subject generator deliberately skips.
 */
export const useMultipleCharacterMilitaryCampaignObjectives =
  defineMultiEsiQuery({
    kind: "character",
    scopes: ["esi.activity.char:read"],
    query: (subjectId, authHeaders) =>
      esiCursorQueryOptions({
        queryKey:
          getCharactersMilitaryCampaignsObjectivesListingQueryKey(subjectId),
        fetchPage: (before, signal) =>
          getCharactersMilitaryCampaignsObjectivesListing(
            subjectId,
            { before, limit: ESI_CURSOR_PAGE_LIMIT },
            authHeaders,
            { signal },
          ),
        itemsOf: (page) => page.objectives,
      }),
  });
