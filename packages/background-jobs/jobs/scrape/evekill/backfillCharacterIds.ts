import { defineJob } from "../../../core";
import { getKv } from "../../../kv";

export interface BackfillEveKillCharactersEventPayload {
  data: {
    url: string;
    batchSize?: number;
    skipBatches?: number;
  };
}

export const backfillEveKillCharacterIds = defineJob<
  BackfillEveKillCharactersEventPayload["data"]
>({
  id: "backfill-evekill-character-ids",
  name: "Backfill Character IDs from EVE Kill",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 5,
  handler: async (ctx) => {
    const batchSize = ctx.payload.batchSize ?? 100;
    const url = ctx.payload.url;

    if (!url) {
      throw new Error("No URL provided.");
    }

    // TODO: Retrieve Character IDs from EVE Kill API
    const characterIds: number[] = await fetch(
      "http://127.0.0.1:8080/chids2.json",
    ).then((res) => res.json());

    characterIds.sort((a, b) => a - b);

    console.log(characterIds.length, "character IDs found");

    const numBatches = Math.ceil(characterIds.length / batchSize);
    const batches = [...Array(numBatches).keys()].map((batchId) =>
      characterIds.slice(batchId * batchSize, (batchId + 1) * batchSize),
    );

    const { kv } = await getKv();
    await kv.queues.characterIds.addBulk(
      batches.map((batch) => ({
        data: { characterIds: batch },
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      })),
    );

    return `#Character IDs: ${characterIds.length} IDs processed in ${batches.length} batches of size ${batchSize}.`;
  },
});
