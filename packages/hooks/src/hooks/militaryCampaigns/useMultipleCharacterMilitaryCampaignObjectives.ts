"use client";

import { useMemo } from "react";

import type {
  CharactersMilitaryCampaignsObjectivesParticipationCharacterobjective,
  GetCharactersMilitaryCampaignsObjectivesListingQueryParams,
} from "@jitaspace/esi-client";
import {
  getCharactersMilitaryCampaignsObjectivesListing,
  getCharactersMilitaryCampaignsObjectivesListingQueryKey,
} from "@jitaspace/esi-client";

import type { EsiSubject } from "../auth";
import type { EsiSubjectItem, MultiEsiQueryResult } from "../multi";
import type { SubjectQueryOptions } from "../multi/useEsiSubjectQueries";
import { useEsiSubjectQueries } from "../multi/useEsiSubjectQueries";
import {
  ESI_CURSOR_PAGE_SIZE,
  esiCursorQueryOptions,
} from "../utils/esiCursorQueryOptions";
import { EAGER_WALK_STALE_TIME_MS } from "../utils/useEagerlyFetchAllPages";

export type CharacterMilitaryCampaignObjective =
  CharactersMilitaryCampaignsObjectivesParticipationCharacterobjective;

/**
 * ESI's newer scope naming (`esi.<area>.<subject>:<verb>`). Deliberately not in
 * the login modal's default set: it would be the first such scope there, and
 * if JitaSpace's EVE application is not registered for it, SSO rejects the
 * whole request, so every login would fail. The military campaigns page asks
 * for it per character instead, where a refusal costs only that button.
 */
export const MILITARY_CAMPAIGN_ACTIVITY_SCOPE = "esi.activity.char:read";

/**
 * Walks forwards from the start: on the freelance listings that is the walk
 * that includes finished records, where `before` returns only the active ones
 * (see `EsiCursorDirection`). A character's participation in finished
 * campaigns is exactly what the page shows.
 */
const PARAMS: GetCharactersMilitaryCampaignsObjectivesListingQueryParams = {
  limit: ESI_CURSOR_PAGE_SIZE,
  after: "0",
};

const buildQuery = (subject: EsiSubject) =>
  ({
    ...esiCursorQueryOptions({
      queryKey: getCharactersMilitaryCampaignsObjectivesListingQueryKey(
        subject.id,
        PARAMS,
      ),
      direction: "after",
      fetchPage: (cursor, request) =>
        getCharactersMilitaryCampaignsObjectivesListing(
          subject.id,
          { ...PARAMS, after: cursor },
          subject.authHeaders,
          request,
        ),
      items: (data) => data.objectives,
      // An objective appears once per character, so its id is the record's
      // identity within one character's walk.
      key: (objective) => objective.id,
    }),
    staleTime: EAGER_WALK_STALE_TIME_MS,
    select: (objectives: CharacterMilitaryCampaignObjective[]) =>
      objectives.map((objective) => ({ ...objective, subjectId: subject.id })),
  }) as unknown as SubjectQueryOptions<
    EsiSubjectItem<CharacterMilitaryCampaignObjective>[]
  >;

/**
 * Every military campaign objective each signed-in character has taken part
 * in, finished campaigns included, flattened and tagged with the character
 * (`subjectId`).
 *
 * Hand-wired rather than generated: the endpoint pages by cursor, which the
 * multi-subject generator deliberately skips.
 */
export function useMultipleCharacterMilitaryCampaignObjectives(): MultiEsiQueryResult<CharacterMilitaryCampaignObjective> {
  const { selected, ...envelope } = useEsiSubjectQueries(
    { kind: "character", scopes: [MILITARY_CAMPAIGN_ACTIVITY_SCOPE] },
    buildQuery,
  );

  const data = useMemo(
    () => selected.flatMap((objectives) => objectives ?? []),
    [selected],
  );

  return { ...envelope, data };
}
