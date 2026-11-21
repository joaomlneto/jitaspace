import { prisma } from "~/lib/db";
import { cacheSdeRead } from "~/lib/sdeCache";

/**
 * Notification type display names (notificationTypes.yaml), keyed by internal
 * name: the same string ESI returns as a notification's `type`. The header's
 * notification feed titles each notification with them.
 *
 * Read once per SDE build: the handler takes no input, so it is prerendered at
 * build and refreshed when the ingest fires the `sde` tag.
 */
async function readNotificationTypeNames(): Promise<Record<string, string>> {
  "use cache";
  cacheSdeRead();
  const rows = await prisma.notificationType.findMany({
    where: { isDeleted: false },
    select: { internalName: true, displayName: true },
  });
  // `displayName` is absent on one record; the client humanizes those.
  return Object.fromEntries(
    rows.flatMap(({ internalName, displayName }) =>
      displayName ? [[internalName, displayName]] : [],
    ),
  );
}

const CACHE_OK = "public, max-age=3600, s-maxage=86400";

export async function GET(): Promise<Response> {
  // A database failure throws: Next answers 500, uncached, and Sentry records
  // it through `onRequestError`.
  return Response.json(await readNotificationTypeNames(), {
    headers: { "Cache-Control": CACHE_OK },
  });
}
