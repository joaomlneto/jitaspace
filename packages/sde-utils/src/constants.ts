export const SDE_DOWNLOAD_URL =
  "https://developers.eveonline.com/static-data/eve-online-static-data-latest-yaml.zip";

/**
 * Freshness signal for the archive above. Returns a single JSON Lines record,
 * `{"_key": "sde", "buildNumber": 3453885, "releaseDate": "2026-07-31T11:29:31Z"}`.
 *
 * The same build number is stamped into `_sde.yaml` at the root of the archive,
 * so a local copy can be checked for staleness without pulling ~100 MB.
 */
export const SDE_LATEST_BUILD_URL =
  "https://developers.eveonline.com/static-data/tranquility/latest.jsonl";

/**
 * Header carrying the build number of the archive `SDE_DOWNLOAD_URL` resolves
 * to. It rides on the 302 to the build-stamped filename, not on the 200 that
 * follows it, so reading it requires `redirect: "manual"`.
 */
export const SDE_BUILD_NUMBER_HEADER = "x-sde-build-number";

/** Metadata entry at the root of the SDE archive; holds `sde.buildNumber`. */
export const SDE_METADATA_FILENAME = "_sde.yaml";
