import type { JobDefinition } from "./defineJob";

export interface JobRegistry {
  readonly jobs: JobDefinition[];
  readonly byId: ReadonlyMap<string, JobDefinition>;
  has(id: string): boolean;
  get(id: string): JobDefinition;
}

/**
 * Index a list of jobs by id. The list is the single source of truth; adapters
 * resolve `ctx.send`/`ctx.invoke` targets (id strings) through `get`. Throws on
 * duplicate ids so a copy-paste mistake fails loudly at startup.
 */
export function createJobRegistry(jobs: JobDefinition[]): JobRegistry {
  const byId = new Map<string, JobDefinition>();
  for (const job of jobs) {
    if (byId.has(job.id)) {
      throw new Error(`Duplicate job id in registry: ${job.id}`);
    }
    byId.set(job.id, job);
  }
  return {
    jobs,
    byId,
    has: (id) => byId.has(id),
    get: (id) => {
      const job = byId.get(id);
      if (!job) throw new Error(`Unknown job id: ${id}`);
      return job;
    },
  };
}
