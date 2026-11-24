import axios from "axios";

import type { SdeRecords, SdeTableName } from "./types";

/**
 * CCP's SDE API, at whatever release is current. `latest` redirects to the
 * release itself, whose files are served immutable, so a record is downloaded
 * once per release. CORS is open, so the browser reads it directly.
 *
 * See https://developers.eveonline.com/blog/the-sde-over-http-static-data-dynamically
 */
export const SDE_BASE_URL = "https://sde.evetech.net/tranquility/latest";

/**
 * Browsers will not let a page set User-Agent; on the server it identifies us
 * to CCP like every other EVE request this project makes.
 */
const SERVER_USER_AGENT = "JitaSpace (https://www.jita.space)";

const sdeClient = axios.create({
  baseURL: SDE_BASE_URL,
  headers:
    typeof window === "undefined" ? { "User-Agent": SERVER_USER_AGENT } : {},
});

/**
 * One record of an SDE table, by its key. A key the table does not have
 * rejects with an axios error carrying status 404, which the app's retry
 * policy does not retry.
 */
export async function fetchSdeRecord<T extends SdeTableName>(
  table: T,
  key: number,
  signal?: AbortSignal,
): Promise<SdeRecords[T]> {
  const response = await sdeClient.get<SdeRecords[T]>(`/${table}/${key}.json`, {
    signal,
  });
  return response.data;
}

/** Every record of an SDE table, from its JSON Lines file. */
export async function fetchSdeTable<T extends SdeTableName>(
  table: T,
  signal?: AbortSignal,
): Promise<SdeRecords[T][]> {
  const response = await sdeClient.get<string>(`/${table}.jsonl`, {
    signal,
    responseType: "text",
  });
  return response.data
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as SdeRecords[T]);
}
