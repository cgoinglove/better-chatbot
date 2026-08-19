/**
 * Display names for the HITL tools.
 *
 * These tools are hidden from the tool selector and driven by the system
 * prompt, so a user has no prior context for `proposeEmail` when the raw
 * identifier shows up in the thread. Each one owns a dedicated card; this map
 * covers the states that fall through to the generic tool row.
 */
export const HITL_TOOL_LABELS: Record<string, string> = {
  proposeEmail: "Email Creator",
  askForPlanApproval: "Plan Approval",
  requestInput: "Input Request",
};
