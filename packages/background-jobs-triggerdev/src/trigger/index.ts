import { registry } from "@jitaspace/background-jobs";

import { toTriggerTask } from "../adapter";

// Register one Trigger.dev task per job, straight from the registry — so the set
// can never drift from @jitaspace/background-jobs. Trigger v4 indexes tasks by
// registration (the task()/schedules.task() call inside toTriggerTask), not by
// export ("hidden tasks"), so nothing here needs to be exported.
for (const job of registry.jobs) {
  toTriggerTask(job);
}
