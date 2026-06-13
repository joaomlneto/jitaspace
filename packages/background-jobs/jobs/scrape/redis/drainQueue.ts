import Queue from "bull";

import { env } from "../../../env";

/**
 * Drain a Bull queue: process jobs until it is empty or a time budget is hit,
 * then return how many were processed.
 *
 * This replaces the old `kv.queues.X.process(cb)` worker pattern, which
 * registers a processor that never returns — it only "worked" on Inngest
 * because the serverless request was killed on timeout. A fresh queue instance
 * is created and closed per run, so this is safe to call repeatedly inside a
 * long-lived worker (e.g. Trigger.dev) without "handler already registered"
 * errors. Producers (the EVE Kill / EVE Ref backfills) still enqueue via the
 * shared lazy `kv` singleton; consumer and producer share the same underlying
 * Redis-backed queue by name.
 */
export async function drainQueue<T>(
  name: string,
  handler: (job: Queue.Job<T>) => Promise<void>,
  {
    budgetMs = 50_000,
    concurrency = 1,
  }: { budgetMs?: number; concurrency?: number } = {},
): Promise<number> {
  const queue = new Queue<T>(name, env.REDIS_URL);
  let processed = 0;

  try {
    const counts = await queue.getJobCounts();
    if (counts.waiting + counts.active + counts.delayed === 0) {
      return 0;
    }

    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      const timer = setTimeout(finish, budgetMs);

      // `drained` fires once the queue has no more waiting jobs; wait for any
      // in-flight (active) jobs to settle before declaring the queue empty.
      queue.on("drained", () => {
        void queue
          .getJobCounts()
          .then((current) => {
            if (current.waiting + current.active === 0) {
              clearTimeout(timer);
              finish();
            }
          })
          .catch(() => {
            /* best-effort: the budget timer is the backstop */
          });
      });

      void queue.process(concurrency, async (job) => {
        await handler(job);
        processed += 1;
      });
    });
  } finally {
    await queue.close();
  }

  return processed;
}
