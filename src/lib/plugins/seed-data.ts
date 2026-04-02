import type { InsertPlugin } from "app-types/plugin";

const TENANT_ID = "00000000-0000-0000-0000-000000000000";

export const DEFAULT_PLUGINS: InsertPlugin[] = [
  {
    tenantId: TENANT_ID,
    userId: null,
    name: "Customer Success",
    description:
      "Account health monitoring, QBRs, renewal preparation, and escalation management",
    category: "productivity",
    icon: "HeartHandshake",
    color: "bg-teal-500/10 text-teal-500",
    systemPromptAddition:
      "You are a customer success and account management assistant. Focus on customer outcomes, measurable value delivered, and proactive risk management.",
    skills: [
      {
        id: "qbr-prep",
        name: "QBR Preparation",
        description: "Prepare a Quarterly Business Review",
        longDescription:
          "Build a complete QBR presentation covering customer goals, value delivered, usage metrics, and next steps.",
        prompt:
          "Help me prepare a QBR (Quarterly Business Review). Create a structure covering: Customer Goals Review, Value Delivered This Quarter, Usage & Adoption Metrics, and Next Steps. What account is this QBR for?",
        category: "productivity",
        tags: ["QBR", "account management"],
      },
    ],
    commands: [
      {
        id: "health-check",
        slug: "health-check",
        name: "Account Health Check",
        description: "Assess account health and identify risks",
        prompt:
          "Run an account health check. Evaluate health across: Usage & Adoption, Engagement Level, Support Ticket Volume, and Contract Risk. Recommend next actions. What account should I assess?",
      },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: "1.0.0",
  },
  {
    tenantId: TENANT_ID,
    userId: null,
    name: "Sales",
    description:
      "Account research, call preparation, pipeline reviews, and competitive intelligence",
    category: "sales",
    icon: "TrendingUp",
    color: "bg-emerald-500/10 text-emerald-500",
    systemPromptAddition:
      "You are an expert sales assistant. Focus on value proposition, ROI, and consultative selling.",
    skills: [
      {
        id: "call-prep",
        name: "Call Prep",
        description: "AI-generated call preparation brief",
        longDescription:
          "Generate a structured call prep document with objectives, discovery questions, and objection handling.",
        prompt:
          "Help me prepare for a sales call. Generate a call prep brief with objectives, discovery questions, anticipated objections, and next steps. Who is the meeting with?",
        category: "productivity",
        tags: ["calls"],
      },
    ],
    commands: [
      {
        id: "pipeline-review",
        slug: "pipeline-review",
        name: "Pipeline Review",
        description: "Run a structured pipeline review",
        prompt:
          "Run a pipeline review. For each deal, assess: Stage, Close Date, Deal Size, Next Action, and Risk Level. Share your pipeline data.",
      },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: "1.0.0",
  },
  {
    tenantId: TENANT_ID,
    userId: null,
    name: "Legal",
    description:
      "Contract review, NDA triage, compliance research, and legal document drafting",
    category: "legal",
    icon: "Scale",
    color: "bg-slate-500/10 text-slate-500",
    systemPromptAddition:
      "You are a legal research and document assistant. Always recommend qualified legal counsel review for important decisions.",
    skills: [
      {
        id: "contract-review",
        name: "Contract Review",
        description: "Extract key provisions and flag risks",
        longDescription:
          "Get a structured summary of key provisions, obligations, and risk areas for attorney review.",
        prompt:
          "Review this contract. Extract: key parties and obligations, important dates, liability clauses, termination conditions, and unusual provisions. Upload the contract.",
        category: "analysis",
        tags: ["contracts"],
      },
    ],
    commands: [
      {
        id: "triage-nda",
        slug: "triage-nda",
        name: "Triage NDA",
        description: "Quickly review an NDA for key terms",
        prompt:
          "Triage this NDA. Extract in a table: Parties, Effective Date, Confidential Information definition, Obligations, Term, and unusual provisions. Upload the NDA.",
      },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: "1.0.0",
  },
  {
    tenantId: TENANT_ID,
    userId: null,
    name: "Project Management",
    description:
      "Project planning, status reports, risk management, and team coordination",
    category: "productivity",
    icon: "Kanban",
    color: "bg-amber-500/10 text-amber-500",
    systemPromptAddition:
      "You are an expert project management assistant. Use structured formats: WBS, RACI, RAID logs, and milestone tables.",
    skills: [
      {
        id: "project-plan",
        name: "Project Plan",
        description: "Generate a structured project plan",
        longDescription:
          "Create a detailed project plan with phases, milestones, tasks, and timeline.",
        prompt:
          "Help me create a project plan with phases, milestones, tasks, dependencies, and timeline. What project am I planning?",
        category: "productivity",
        tags: ["planning"],
      },
      {
        id: "status-report",
        name: "Status Report",
        description: "Generate a project status report",
        longDescription:
          "Create a formatted status report with RAG status, accomplishments, and risks.",
        prompt:
          "Generate a project status report with: Overall Status (RAG), Accomplishments, Next Priorities, Risks & Issues. What project?",
        category: "drafting",
        tags: ["status"],
      },
    ],
    commands: [
      {
        id: "standup",
        slug: "standup",
        name: "Daily Standup",
        description: "Format a daily standup update",
        prompt:
          "Format my daily standup: Yesterday I completed, Today I'm working on, Blockers. What did you work on?",
      },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: "1.0.0",
  },
  {
    tenantId: TENANT_ID,
    userId: null,
    name: "Marketing",
    description:
      "Content strategy, social media, campaign planning, and brand messaging",
    category: "productivity",
    icon: "Megaphone",
    color: "bg-pink-500/10 text-pink-500",
    systemPromptAddition:
      "You are a professional marketing and content strategy assistant. Tailor messaging to audience, channel, and funnel stage.",
    skills: [
      {
        id: "social-posts",
        name: "Social Media Posts",
        description: "Generate platform-optimized social posts",
        longDescription:
          "Create LinkedIn, Twitter/X, and general social posts.",
        prompt:
          "Write social media posts for LinkedIn, Twitter/X, and general use. What topic?",
        category: "drafting",
        tags: ["social"],
      },
    ],
    commands: [
      {
        id: "blog-post",
        slug: "blog-post",
        name: "Blog Post",
        description: "Draft a professional blog post",
        prompt:
          "Draft a professional blog post with title, introduction, 3-5 body sections, and conclusion with CTA. Topic and audience?",
      },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: "1.0.0",
  },
  {
    tenantId: TENANT_ID,
    userId: null,
    name: "Research & Analysis",
    description: "Market research, competitive analysis, data interpretation",
    category: "research",
    icon: "Search",
    color: "bg-indigo-500/10 text-indigo-500",
    systemPromptAddition:
      "You are an expert research assistant. Present findings in structured formats with cited sources.",
    skills: [
      {
        id: "swot-analysis",
        name: "SWOT Analysis",
        description: "Generate a SWOT analysis",
        longDescription:
          "Build a comprehensive SWOT with strengths, weaknesses, opportunities, threats.",
        prompt:
          "Create a SWOT analysis for this subject. What company, product, or initiative?",
        category: "analysis",
        tags: ["strategy"],
      },
    ],
    commands: [
      {
        id: "research",
        slug: "research",
        name: "Research Topic",
        description: "Deep-dive research on any topic",
        prompt:
          "Research this topic comprehensively. Provide key findings, important facts, and sources. What should I research?",
      },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: "1.0.0",
  },
  {
    tenantId: TENANT_ID,
    userId: null,
    name: "Finance & Reporting",
    description: "Financial analysis, budget planning, expense reporting",
    category: "productivity",
    icon: "BarChart3",
    color: "bg-orange-500/10 text-orange-500",
    systemPromptAddition:
      "You are a financial analysis assistant. Present financial data clearly in tables with proper formatting.",
    skills: [
      {
        id: "budget-analysis",
        name: "Budget Analysis",
        description: "Analyze budget vs. actual performance",
        longDescription:
          "Get a variance analysis with explanations and recommendations.",
        prompt:
          "Analyze my budget vs. actual performance. Calculate variances and recommend actions. Paste your data.",
        category: "analysis",
        tags: ["budget"],
      },
    ],
    commands: [
      {
        id: "financial-summary",
        slug: "financial-summary",
        name: "Financial Summary",
        description: "Create an executive financial summary",
        prompt:
          "Create an executive financial summary with key metrics, performance vs. targets, and recommendations. What period?",
      },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: "1.0.0",
  },
  {
    tenantId: TENANT_ID,
    userId: null,
    name: "HR & People",
    description:
      "HR policy lookup, onboarding guides, job descriptions, and people analytics",
    category: "hr",
    icon: "Users",
    color: "bg-violet-500/10 text-violet-500",
    systemPromptAddition:
      "You are an HR and people operations assistant. Be empathetic, professional, and inclusive.",
    skills: [
      {
        id: "job-description",
        name: "Job Description Writer",
        description: "Generate inclusive job descriptions",
        longDescription:
          "Create a complete, inclusive job posting with responsibilities, qualifications, and benefits.",
        prompt:
          "Write a job description with role summary, responsibilities, qualifications, and what we offer. What role?",
        category: "drafting",
        tags: ["recruiting"],
      },
    ],
    commands: [
      {
        id: "onboard",
        slug: "onboard",
        name: "Onboarding Checklist",
        description: "Generate a new hire onboarding checklist",
        prompt:
          "Generate an onboarding checklist with: Pre-arrival setup, Day 1, Week 1, 30/60/90 milestones, and key training. What role?",
      },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: "1.0.0",
  },
  {
    tenantId: TENANT_ID,
    userId: null,
    name: "Technical & Engineering",
    description:
      "Code review, technical specifications, architecture decisions, and documentation",
    category: "custom",
    icon: "Code2",
    color: "bg-cyan-500/10 text-cyan-500",
    systemPromptAddition:
      "You are an expert software engineering assistant. Write clean, secure code and flag OWASP security vulnerabilities immediately.",
    skills: [
      {
        id: "code-review",
        name: "Code Review",
        description: "Comprehensive code review",
        longDescription:
          "Get a structured code review covering correctness, performance, security, and maintainability.",
        prompt:
          "Review this code for: Correctness, Performance, Security Vulnerabilities, Maintainability, and Test Coverage. Paste the code.",
        category: "analysis",
        tags: ["code review"],
      },
      {
        id: "tech-spec",
        name: "Technical Specification",
        description: "Write a technical specification",
        longDescription:
          "Create a comprehensive tech spec with architecture, API design, and testing strategy.",
        prompt:
          "Help me write a technical spec with: Overview, Requirements, Architecture, API Design, and Testing Strategy. What are we building?",
        category: "drafting",
        tags: ["tech spec"],
      },
    ],
    commands: [
      {
        id: "explain-code",
        slug: "explain-code",
        name: "Explain Code",
        description: "Explain what code does",
        prompt:
          "Explain this code in plain English — what it does, how it works, patterns used, and gotchas. Paste the code.",
      },
      {
        id: "write-tests",
        slug: "write-tests",
        name: "Write Tests",
        description: "Generate unit and integration tests",
        prompt:
          "Write comprehensive tests covering: happy path, edge cases, error conditions. Paste the code to test.",
      },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: "1.0.0",
  },
  {
    tenantId: TENANT_ID,
    userId: null,
    name: "Environmental & Compliance",
    description:
      "EPA regulations, source testing standards, environmental consulting",
    category: "research",
    icon: "Leaf",
    color: "bg-green-500/10 text-green-500",
    systemPromptAddition:
      "You are an environmental consulting and regulatory compliance assistant. Reference specific EPA methods, CFR citations, and state requirements.",
    skills: [
      {
        id: "reg-research",
        name: "Regulatory Research",
        description: "Research EPA and environmental regulations",
        longDescription:
          "Search for applicable regulations, standards, and compliance requirements.",
        prompt:
          "Research environmental regulations for this facility type, pollutant, or regulatory topic. What are you researching?",
        category: "research",
        tags: ["EPA", "regulations"],
      },
    ],
    commands: [
      {
        id: "test-plan",
        slug: "test-plan",
        name: "Source Test Plan",
        description: "Draft a source emission test plan",
        prompt:
          "Draft a source emission test plan covering: Facility Description, Applicable Regulations, EPA Methods, Equipment, QA/QC, and Schedule. What facility and pollutants?",
      },
    ],
    isBuiltIn: true,
    isPublic: true,
    version: "1.0.0",
  },
];
