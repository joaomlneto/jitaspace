import { readMarketTree } from "~/components/Market/readMarketTree";

/**
 * The market sidebar's whole tree as one JSON document.
 *
 * It reads no request data, so Next prerenders it at build and the CDN serves
 * that copy until the next SDE ingest revalidates the `sde` tag. The database
 * is read about once per deploy or ingest, however many market pages are
 * viewed, and pages no longer carry the tree in their own payload.
 */
export async function GET(): Promise<Response> {
  return Response.json(await readMarketTree());
}
