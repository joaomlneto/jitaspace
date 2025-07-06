import { MultiBar, Presets } from "cli-progress";

export const globalProgress = new MultiBar(
  {
    format: `{title} | {bar} | {value}/{total} | {duration_formatted}`,
    clearOnComplete: true,
    stopOnComplete: false,
    emptyOnZero: true,
  },
  Presets.rect,
);
