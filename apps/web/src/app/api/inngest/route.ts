import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  executeScheduledTask,
  scheduledTaskCronChecker,
} from "@/lib/inngest/functions/scheduled-tasks";
import { projectBrainDreamCycle } from "@/lib/inngest/functions/project-brain-dream-cycle";
import { projectBrainIngestRun } from "@/lib/inngest/functions/project-brain-ingest";
import { cloudInngestFunctions } from "@/lib/inngest/functions/cloud";
import { reapIdleSandboxes } from "@/lib/inngest/functions/reap-sandboxes";

// The execute-scheduled-task step holds this function open while the loopback
// /api/chat stream (maxDuration 300) runs to completion.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeScheduledTask,
    scheduledTaskCronChecker,
    projectBrainDreamCycle,
    projectBrainIngestRun,
    reapIdleSandboxes,
    ...cloudInngestFunctions,
  ],
});
