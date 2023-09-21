import { CrudStatistics } from "./CrudStatistics";

export type BatchStepResult<T extends string> = {
  elapsed: number;
  stats: {
    [key in T]: CrudStatistics;
  };
};
