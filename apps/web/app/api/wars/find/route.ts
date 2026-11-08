import { prisma } from "~/lib/db";
import { parsePositiveEntityId } from "~/lib/routeParams";

/**
 * The war a notification is about, found from its two sides: war notifications
 * name the declarer and the defender (`declaredByID`, `againstID`), never the
 * war. Answers with the latest war between them that was declared by `at`, the
 * notification's time, and had not already ended by then. So a retraction or
 * surrender notice finds the war it ended rather than a later one, and a new
 * declaration never resolves to an older, finished war between the same sides
 * while the new one has yet to be scraped.
 *
 * `GET /api/wars/find?aggressor=<id>&defender=<id>&at=<ISO time>` → `{ warId }`,
 * or 404 when we have no such war (yet: wars are scraped from ESI, so one
 * declared minutes ago may not be in the database). With `either=1` the two
 * sides match either way round, for surrender notices, which name both sides
 * without saying who declared. Both sides are required: one side alone matches
 * any of its wars, which would be a guess.
 */

/**
 * A war found under these rules stays the answer: the sides, the declaration
 * cutoff and "not over by then" all hold for it from then on.
 */
const CACHE_FOUND = "public, max-age=86400, s-maxage=604800, immutable";
/** A miss may only mean the scrape has not caught up; retry soon. */
const CACHE_MISSING = "public, max-age=300, s-maxage=300";

/**
 * Declarations are recorded by ESI a little before the notification is sent;
 * allow for clock skew between the two.
 */
const DECLARED_SLACK_MS = 60 * 60 * 1000;

/**
 * How long before the notification the war may have finished. Notices about a
 * war's end (retracted, surrendered, invalidated) are sent around the moment it
 * finishes, so a day covers skew and the scrape's view of the end date, while a
 * war that ended weeks earlier can't be the one meant.
 */
const ENDED_SLACK_MS = 24 * 60 * 60 * 1000;

/**
 * Alliance and corporation ids overlap in the legacy range, so a party is
 * matched against both columns.
 */
const aggressor = (id: number) => ({
  OR: [{ aggressorAllianceId: id }, { aggressorCorporationId: id }],
});
const defender = (id: number) => ({
  OR: [{ defenderAllianceId: id }, { defenderCorporationId: id }],
});

/** The sides a war must have; both ways round when `eitherWay`. */
function sides(aggressorId: number, defenderId: number, eitherWay: boolean) {
  const asGiven = { AND: [aggressor(aggressorId), defender(defenderId)] };
  if (!eitherWay) return asGiven;
  return {
    OR: [asGiven, { AND: [aggressor(defenderId), defender(aggressorId)] }],
  };
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const aggressorId = parsePositiveEntityId(params.get("aggressor") ?? "");
  const defenderId = parsePositiveEntityId(params.get("defender") ?? "");
  const at = Date.parse(params.get("at") ?? "");
  const eitherWay = params.get("either") === "1";

  if (aggressorId === null || defenderId === null) {
    return Response.json(
      { error: "aggressor and defender must both be entity ids." },
      { status: 400 },
    );
  }
  if (Number.isNaN(at)) {
    return Response.json(
      { error: "at must be an ISO date-time." },
      { status: 400 },
    );
  }

  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  const war = await prisma.war.findFirst({
    select: { warId: true },
    where: {
      AND: [
        sides(aggressorId, defenderId, eitherWay),
        { declaredDate: { lte: new Date(at + DECLARED_SLACK_MS) } },
        {
          OR: [
            { finishedDate: null },
            { finishedDate: { gte: new Date(at - ENDED_SLACK_MS) } },
          ],
        },
      ],
    },
    orderBy: { declaredDate: "desc" },
  });

  if (!war) {
    return Response.json(
      { error: "No such war." },
      { status: 404, headers: { "Cache-Control": CACHE_MISSING } },
    );
  }
  return Response.json(
    { warId: war.warId },
    { headers: { "Cache-Control": CACHE_FOUND } },
  );
}
