/**
 * Sales Hunter workflow templates.
 *
 * These are serialisable configuration objects — not executable code.
 * The workflow engine reads these templates to create runnable workflow
 * instances that orchestrate agents, connectors, conditions, and actions.
 */

export type SalesWorkflowStep = {
  id: string;
  name: string;
  type: "agent" | "connector" | "condition" | "action";
  agentType?: string;
  config: Record<string, unknown>;
  nextSteps?: { condition?: string; stepId: string }[];
};

export type SalesWorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  trigger: "manual" | "scheduled" | "event";
  schedule?: string;
  steps: SalesWorkflowStep[];
};

// ---------------------------------------------------------------------------
// 1. Lead Enrichment Pipeline
// ---------------------------------------------------------------------------

const leadEnrichmentPipeline: SalesWorkflowTemplate = {
  id: "sh-wf-lead-enrichment",
  name: "Lead Enrichment Pipeline",
  description:
    "Automatically enriches new leads with firmographic and technographic data from connected CRM sources, scores them using the qualifier agent, and notifies the assigned rep when a high-score lead is detected.",
  trigger: "event",
  steps: [
    {
      id: "step-enrich-crm",
      name: "Enrich from CRM",
      type: "connector",
      config: {
        connectorType: "salesforce",
        fallbackConnectorType: "hubspot",
        operation: "enrich-lead",
        fields: [
          "company_size",
          "industry",
          "revenue",
          "technology_stack",
          "recent_funding",
          "decision_makers",
        ],
        matchStrategy: "email-domain-first",
        timeout: 30000,
      },
      nextSteps: [{ stepId: "step-qualify-lead" }],
    },
    {
      id: "step-qualify-lead",
      name: "Score with Qualifier Agent",
      type: "agent",
      agentType: "qualifier",
      config: {
        framework: "auto",
        includeEnrichedData: true,
        minDataPointsRequired: 3,
        outputFields: [
          "qualification_score",
          "framework_used",
          "dimension_breakdown",
          "risk_factors",
          "recommended_next_steps",
        ],
      },
      nextSteps: [
        {
          condition: "qualification_score >= 75",
          stepId: "step-notify-high-score",
        },
        {
          condition: "qualification_score >= 40 && qualification_score < 75",
          stepId: "step-update-lead-warm",
        },
        {
          condition: "qualification_score < 40",
          stepId: "step-update-lead-nurture",
        },
      ],
    },
    {
      id: "step-notify-high-score",
      name: "Notify Rep — High-Score Lead",
      type: "action",
      config: {
        actionType: "notification",
        channel: "in-app",
        urgency: "high",
        title: "High-Score Lead Detected",
        body: "A new lead scored {{qualification_score}}/100 ({{framework_used}}). Company: {{company_name}}. Recommended action: {{recommended_next_steps}}.",
        recipientStrategy: "assigned-rep",
        fallbackRecipient: "sales-manager",
        updateLeadStatus: "qualified",
      },
    },
    {
      id: "step-update-lead-warm",
      name: "Update Lead — Warm",
      type: "action",
      config: {
        actionType: "update-record",
        targetEntity: "lead",
        updates: {
          status: "contacted",
          score: "{{qualification_score}}",
        },
        addNote:
          "Auto-qualified by AI: score {{qualification_score}} ({{framework_used}}). Gaps: {{risk_factors}}.",
      },
    },
    {
      id: "step-update-lead-nurture",
      name: "Update Lead — Nurture",
      type: "action",
      config: {
        actionType: "update-record",
        targetEntity: "lead",
        updates: {
          status: "new",
          score: "{{qualification_score}}",
        },
        addNote:
          "Auto-qualified by AI: score {{qualification_score}} ({{framework_used}}). Not yet ready — added to nurture track.",
        addToSequence: "long-term-nurture",
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. Outreach Sequence
// ---------------------------------------------------------------------------

const outreachSequence: SalesWorkflowTemplate = {
  id: "sh-wf-outreach-sequence",
  name: "Outreach Sequence",
  description:
    "Researches a target prospect, composes personalised multi-channel outreach, and creates follow-up tasks in the CRM to ensure consistent cadence execution.",
  trigger: "manual",
  steps: [
    {
      id: "step-research-prospect",
      name: "Research Prospect",
      type: "agent",
      agentType: "prospector",
      config: {
        researchDepth: "deep",
        sources: ["web", "linkedin", "crunchbase", "news"],
        outputFields: [
          "company_summary",
          "key_contacts",
          "fit_score",
          "intent_signals",
          "recommended_approach",
          "recent_events",
        ],
        maxResearchTime: 60000,
      },
      nextSteps: [{ stepId: "step-compose-outreach" }],
    },
    {
      id: "step-compose-outreach",
      name: "Compose Outreach",
      type: "agent",
      agentType: "outreach-composer",
      config: {
        cadenceLength: 5,
        channels: ["email", "linkedin", "phone"],
        includeResearchContext: true,
        toneAutoDetect: true,
        abVariants: 2,
        outputFields: [
          "email_draft",
          "email_subject_lines",
          "linkedin_connection_note",
          "linkedin_followup",
          "phone_script",
          "voicemail_script",
          "followup_sequence",
          "ab_test_suggestions",
        ],
      },
      nextSteps: [{ stepId: "step-create-tasks" }],
    },
    {
      id: "step-create-tasks",
      name: "Create Follow-Up Tasks",
      type: "action",
      config: {
        actionType: "create-tasks",
        taskSource: "followup_sequence",
        assignTo: "triggering-user",
        taskDefaults: {
          priority: "high",
          category: "outreach",
        },
        createCrmActivities: true,
        syncToConnector: true,
        connectorPreference: ["salesforce", "hubspot"],
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. Pipeline Health Review
// ---------------------------------------------------------------------------

const pipelineHealthReview: SalesWorkflowTemplate = {
  id: "sh-wf-pipeline-health-review",
  name: "Pipeline Health Review",
  description:
    "Runs a weekly automated review of the sales pipeline — pulling current data from the CRM, analysing health metrics with the pipeline analyst agent, generating an executive summary report, and alerting sales leadership on at-risk deals.",
  trigger: "scheduled",
  schedule: "0 8 * * 1",
  steps: [
    {
      id: "step-pull-pipeline-data",
      name: "Pull Pipeline Data",
      type: "connector",
      config: {
        connectorType: "salesforce",
        fallbackConnectorType: "hubspot",
        operation: "pull-pipeline",
        filters: {
          statuses: ["contacted", "qualified", "proposal", "negotiation"],
          excludeClosed: true,
          includeActivityHistory: true,
          activityHistoryDays: 30,
        },
        fields: [
          "deal_name",
          "company",
          "value",
          "stage",
          "owner",
          "created_at",
          "last_activity_at",
          "close_date",
          "competitor",
          "champion",
          "next_step",
        ],
        timeout: 60000,
      },
      nextSteps: [{ stepId: "step-analyse-pipeline" }],
    },
    {
      id: "step-analyse-pipeline",
      name: "Analyse Pipeline Health",
      type: "agent",
      agentType: "pipeline-analyst",
      config: {
        analysisScope: "full",
        includeVelocityAnalysis: true,
        includeConversionAnalysis: true,
        includeStagnationDetection: true,
        includeWinLossPatterns: true,
        includeRevenueForecast: true,
        forecastScenarios: ["conservative", "expected", "optimistic"],
        comparisonPeriod: "previous-week",
        outputFields: [
          "pipeline_health_score",
          "pipeline_coverage",
          "velocity_metrics",
          "stage_conversion_rates",
          "revenue_forecast",
          "at_risk_deals",
          "stagnant_deals",
          "top_recommendations",
        ],
      },
      nextSteps: [{ stepId: "step-generate-report" }],
    },
    {
      id: "step-generate-report",
      name: "Generate Executive Report",
      type: "action",
      config: {
        actionType: "generate-report",
        reportTemplate: "pipeline-health-weekly",
        format: "structured",
        sections: [
          "executive-summary",
          "pipeline-scorecard",
          "forecast-comparison",
          "at-risk-deals",
          "conversion-trends",
          "recommended-actions",
        ],
        distribution: {
          roles: ["sales-manager", "vp-sales"],
          channel: "in-app",
          emailSummary: true,
        },
        archiveReport: true,
      },
      nextSteps: [
        {
          condition: "at_risk_deals.length > 0",
          stepId: "step-alert-at-risk",
        },
      ],
    },
    {
      id: "step-alert-at-risk",
      name: "Alert on At-Risk Deals",
      type: "action",
      config: {
        actionType: "notification",
        channel: "in-app",
        urgency: "high",
        title: "At-Risk Deals Detected — Weekly Pipeline Review",
        body: "{{at_risk_deals.length}} deal(s) flagged as at-risk in this week's pipeline review. Total at-risk value: ${{at_risk_total_value}}. Review the full report for details and recommended actions.",
        recipientStrategy: "deal-owners-and-manager",
        includeDeepLink: true,
        deepLinkTarget: "pipeline-health-report",
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const salesWorkflowTemplates: SalesWorkflowTemplate[] = [
  leadEnrichmentPipeline,
  outreachSequence,
  pipelineHealthReview,
];
