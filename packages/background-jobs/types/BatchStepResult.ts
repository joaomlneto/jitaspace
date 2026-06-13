import type { CrudStatistics } from "./CrudStatistics";

export interface BatchStepResult<T extends string> {
  elapsed: number;
  stats: Record<T, CrudStatistics>;
}
