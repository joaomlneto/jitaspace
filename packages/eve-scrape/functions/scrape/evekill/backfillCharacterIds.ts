import pLimit from "p-limit";

import { kv } from "@jitaspace/kv";

import { client } from "../../../client";

export type BackfillEveKillCharactersEventPayload = {
  data: {
    url: string;
    batchSize?: number;
    skipBatches?: number;
  };
};

type StatsKey = "characters";

export const backfillEveKillCharacterIds = client.createFunction(
  {
    id: "backfill-evekill-character-ids",
    name: "Backfill Character IDs from EVE Kill",
    concurrency: {
      limit: 1,
    },
    retries: 5,
  },
  { event: "backfill/evekill/character-ids" },
  async ({ event, step, logger }) => {
    const batchSize = event.data.batchSize ?? 100;
    const url = event.data.url;

    if (!url) {
      throw new Error("No URL provided.");
    }

    const limit = pLimit(1);

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

    await kv.queues.characterIds.addBulk(
      batches.map((batch, i) => ({
        data: { characterIds: batch },
        opts: {
          removeOnComplete: true,
          removeOnFail: false,
        },
      })),
    );

    return `#Character IDs: ${characterIds.length} IDs processed in ${batches.length} batches of size ${batchSize}.`;
  },
);
