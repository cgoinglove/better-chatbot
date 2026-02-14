import type { VerticalAgentDefaults } from "app-types/platform";
import { prospectorAgent } from "./prospector";
import { qualifierAgent } from "./qualifier";
import { outreachAgent } from "./outreach";
import { pipelineAnalystAgent } from "./pipeline-analyst";
import { dealCoachAgent } from "./deal-coach";

export const salesHunterAgentDefaults: VerticalAgentDefaults[] = [
  prospectorAgent,
  qualifierAgent,
  outreachAgent,
  pipelineAnalystAgent,
  dealCoachAgent,
];
