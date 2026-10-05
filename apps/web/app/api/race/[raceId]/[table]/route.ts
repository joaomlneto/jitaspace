import type { RaceTableName, RaceTables } from "~/app/race/[raceId]/types";
import { isRaceTableName } from "~/app/race/[raceId]/constants";
import {
  readRaceAlphaSkills,
  readRaceCorporations,
  readRaceItems,
  readRaceMetadata,
  readRaceRacialSkills,
  readRaceStations,
} from "~/app/race/[raceId]/data";
import { parsePositiveEntityId } from "~/lib/routeParams";

/**
 * One of the long lists behind `/race/[raceId]`'s tabs, as JSON: every item the
 * SDE gives the race, its NPC corporations, its stations, or its Alpha clone
 * and racial skills. The page ships without them, since an empire's items
 * alone run to thousands of rows, and a tab fetches its own lists when it
 * opens.
 *
 * Cached at the CDN for an hour, the shortest lifetime of the lists (NPC
 * corporation member counts), so the database sees about one read per list
 * per race per hour however many visitors open the tab.
 */
const CACHE_OK =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

const READERS: {
  [K in RaceTableName]: (raceId: number) => Promise<RaceTables[K]>;
} = {
  items: readRaceItems,
  corporations: readRaceCorporations,
  stations: readRaceStations,
  alphaSkills: readRaceAlphaSkills,
  racialSkills: readRaceRacialSkills,
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ raceId: string; table: string }> },
): Promise<Response> {
  const { raceId: raw, table } = await params;
  const raceId = parsePositiveEntityId(raw);
  if (raceId === null) {
    return Response.json({ error: "Not a race id." }, { status: 400 });
  }
  if (!isRaceTableName(table)) {
    return Response.json({ error: `No table "${table}".` }, { status: 404 });
  }

  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const race = await readRaceMetadata(raceId);
  if (!race) {
    return Response.json(
      { error: `Race ${raceId} does not exist.` },
      { status: 404 },
    );
  }
  return Response.json(await READERS[table](raceId), {
    headers: { "Cache-Control": CACHE_OK },
  });
}
