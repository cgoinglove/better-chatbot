/**
 * Qualification framework prompts for the Sales Hunter vertical.
 *
 * Each framework prompt provides detailed guidance that an LLM can follow
 * to systematically evaluate and score a lead against the given methodology.
 */

export const BANT_FRAMEWORK = `BANT QUALIFICATION FRAMEWORK

BANT is a foundational sales qualification methodology that evaluates four critical dimensions of a prospect's readiness to buy. Use this framework to determine whether a lead is worth pursuing and where to focus discovery conversations.

BUDGET (0-25 points)
Assess the prospect's financial capacity and willingness to invest.
- 21-25: Budget is explicitly approved and allocated for this fiscal period. The prospect has confirmed a specific dollar range that aligns with your solution's pricing.
- 16-20: Budget exists within the department but has not been formally allocated to this initiative. The prospect acknowledges a general spending range and indicates funding is accessible.
- 11-15: Budget is theoretically available but would require approval from finance or a budget reallocation. The prospect has expressed willingness to pursue funding but cannot guarantee it.
- 6-10: No current budget exists. The prospect indicates they would need to build a business case or wait for the next budget cycle. Timeline to funding is uncertain.
- 0-5: The prospect has explicitly stated they have no budget and no path to securing one. Or the organisation is in a hiring or spending freeze.
Key discovery questions: "Has budget been allocated for solving this problem?" / "What is the typical approval process for investments of this size?" / "Are there other initiatives competing for the same budget?"

AUTHORITY (0-25 points)
Determine whether you are engaging with decision-makers or influencers.
- 21-25: Your primary contact is the economic buyer with final sign-off authority, or you have direct and confirmed access to that person.
- 16-20: Your contact is a strong internal champion who has a direct reporting line to the decision-maker and has successfully sponsored purchases of similar magnitude before.
- 11-15: Your contact is a stakeholder in the evaluation but is not the final decision-maker. They can influence the decision and have agreed to facilitate introductions.
- 6-10: Your contact is a lower-level employee who is interested but has limited organisational influence. The path to the decision-maker is unclear.
- 0-5: You have no access to anyone with purchasing authority, and your contact has not indicated willingness or ability to connect you higher in the organisation.
Key discovery questions: "Who will make the final purchasing decision?" / "Have you sponsored similar purchases before?" / "What does the approval chain look like for a decision of this nature?"

NEED (0-25 points)
Evaluate the prospect's pain points and how well your solution addresses them.
- 21-25: The prospect has articulated a specific, urgent business problem that your solution directly solves. They can quantify the cost of inaction (revenue lost, hours wasted, compliance risk).
- 16-20: The prospect recognises a clear need and has been actively evaluating solutions. They can describe the problem but have not fully quantified the impact.
- 11-15: The prospect acknowledges a general area of improvement but has not prioritised it. The need exists but competes with other organisational priorities.
- 6-10: The need is latent. The prospect has not independently identified the problem, but your research suggests it exists. Significant education would be required.
- 0-5: No identifiable need. The prospect's current solution appears adequate, or the problem domain is irrelevant to their business.
Key discovery questions: "What is the biggest challenge you face in [relevant area]?" / "What would it cost your business if this problem remains unsolved for another 12 months?" / "How are you handling this today?"

TIMELINE (0-25 points)
Understand the prospect's urgency and decision timeline.
- 21-25: The prospect has a defined timeline with a target decision date within the current quarter. There is a triggering event (contract expiry, regulatory deadline, board mandate) driving urgency.
- 16-20: The prospect intends to make a decision within the next two quarters. There is organisational momentum but no hard deadline.
- 11-15: The prospect is in early-stage exploration with a vague timeline of "sometime this year." No specific triggering event has been identified.
- 6-10: The prospect has expressed interest but has no timeline. The initiative is in the "someday" category and could easily stall.
- 0-5: No timeline exists. The prospect is not actively considering a change and has indicated no plans to evaluate in the foreseeable future.
Key discovery questions: "When are you hoping to have a solution in place?" / "Is there a specific event or deadline driving this evaluation?" / "What happens if the decision slips to next quarter?"`;

export const MEDDIC_FRAMEWORK = `MEDDIC QUALIFICATION FRAMEWORK

MEDDIC is a rigorous enterprise sales qualification methodology designed for complex, high-value deals. It provides six dimensions for evaluating deal viability and identifying gaps that could derail the opportunity.

METRICS (0-17 points)
Quantifiable business outcomes the prospect expects to achieve.
- 14-17: The prospect has specific, measurable KPIs they expect to improve (e.g. "reduce claim processing time from 14 days to 3 days" or "increase pipeline conversion by 20%"). These metrics are documented and agreed upon by stakeholders.
- 9-13: The prospect can articulate general improvement areas with approximate targets but has not formalised specific metrics or tied them to business outcomes in a written document.
- 4-8: The prospect acknowledges room for improvement but struggles to quantify the expected impact. Metrics would need to be developed collaboratively during the sales process.
- 0-3: No discussion of measurable outcomes has occurred. The prospect cannot articulate what success looks like in quantitative terms.
Coaching tip: Help the prospect build a value model by connecting your solution's capabilities to their specific business metrics. Use industry benchmarks when the prospect's own data is unavailable.

ECONOMIC BUYER (0-17 points)
The individual with ultimate authority and budget control.
- 14-17: You have met with the economic buyer, they are engaged in the evaluation, and they have confirmed both the budget and the strategic importance of the initiative.
- 9-13: You have identified the economic buyer and have an introduction scheduled or a confirmed path through a champion. The champion has validated the buyer's interest.
- 4-8: You believe you know who the economic buyer is but have no direct access. Your champion is willing to advocate but cannot guarantee a meeting.
- 0-3: The economic buyer is unknown or you have been explicitly blocked from accessing them. No champion has offered to facilitate access.

DECISION CRITERIA (0-17 points)
The formal and informal factors the organisation will use to evaluate solutions.
- 14-17: You have a documented list of decision criteria (technical requirements, compliance needs, integration requirements, pricing model preferences) and your solution aligns with the majority of them. You have influenced the criteria to favour your strengths.
- 9-13: You understand the general decision criteria through discovery conversations but they are not formally documented. Your solution appears to align well but you have not validated every requirement.
- 4-8: Decision criteria are vague or still being developed. The prospect is early in defining what they need, and there is risk that criteria could shift to favour a competitor.
- 0-3: No decision criteria have been shared. The prospect may not have a formal evaluation process, or you have been unable to surface their requirements.

DECISION PROCESS (0-17 points)
The steps, stakeholders, and timeline involved in making the purchasing decision.
- 14-17: You have a clear, validated map of the decision process including: evaluation steps, key milestones, stakeholders involved at each stage, procurement and legal requirements, and a confirmed decision date.
- 9-13: You understand the general process (e.g. "security review, then procurement, then legal") but lack specifics on timeline or have not confirmed with all stakeholders.
- 4-8: The prospect has given vague descriptions of the process. Key steps like security review, legal approval, or procurement timelines are unknown.
- 0-3: The decision process is completely opaque. You do not know who is involved, what steps are required, or how long it will take.

IDENTIFY PAIN (0-16 points)
The specific business problems driving the prospect to seek a solution.
- 13-16: The prospect has articulated acute, specific pain points that are impacting their business today. They can describe the consequences of inaction and have executive-level urgency to resolve the problem.
- 8-12: The prospect acknowledges pain but it is not yet severe enough to force immediate action. The problem is recognised but may compete with other priorities for attention and resources.
- 4-7: Pain is latent or assumed based on your research. The prospect has not explicitly confirmed they experience the problem you are positioned to solve.
- 0-3: No pain has been identified. The prospect appears satisfied with their current state or the pain is too minor to justify a purchasing decision.

CHAMPION (0-16 points)
An internal advocate who has personal credibility and motivation to drive the deal forward.
- 13-16: You have an identified champion who has organisational influence, personal motivation to see the deal succeed (career advancement, solving a problem their team faces), and is actively selling internally on your behalf. They provide intelligence on internal dynamics and facilitate access to other stakeholders.
- 8-12: You have a contact who is supportive and willing to advocate but lacks strong organisational influence or has not yet demonstrated the ability to drive action internally.
- 4-7: You have a friendly contact but they are passive. They respond to your requests but do not proactively advance the deal or provide internal intelligence.
- 0-3: No internal champion exists. You are selling entirely from the outside with no one inside the organisation actively supporting your cause.`;

export const SPIN_FRAMEWORK = `SPIN SELLING METHODOLOGY

SPIN is a consultative selling framework developed by Neil Rackham that structures discovery conversations around four types of questions. Use this framework to guide prospect conversations that uncover deep needs and build urgency without resorting to high-pressure tactics.

SITUATION QUESTIONS (Context Gathering)
Purpose: Establish a baseline understanding of the prospect's current environment, processes, and tools.
- "How is your team currently handling [relevant process]?"
- "What tools or systems are you using for [specific function]?"
- "How many people are involved in [process area]?"
- "What does your typical workflow look like from [start point] to [end point]?"
- "How long have you been using your current approach?"

Best practices for situation questions:
- Do your homework before the call. Use web research and CRM data to pre-answer as many situation questions as possible so you can spend meeting time on higher-value questions.
- Limit situation questions to five or fewer per conversation. Excessive situation questions make the prospect feel interrogated and signal that you have not prepared.
- Use situation questions to transition naturally into problem questions by identifying areas where the current approach may have limitations.

PROBLEM QUESTIONS (Pain Discovery)
Purpose: Surface specific difficulties, dissatisfactions, or challenges the prospect experiences.
- "What are the biggest challenges you face with [current approach]?"
- "How often does [specific problem] occur?"
- "What happens when [process] breaks down or takes longer than expected?"
- "Where do you see the most friction in your current workflow?"
- "What feedback have you received from your team about [relevant area]?"

Best practices for problem questions:
- Focus on problems your solution can actually address. Surfacing pain you cannot resolve erodes trust.
- Listen for emotional cues (frustration, resignation, urgency) that indicate the severity of the problem.
- Document specific problems with concrete examples. "We lose about 10 hours per week on manual data entry" is far more powerful than "data entry is a hassle."

IMPLICATION QUESTIONS (Impact Amplification)
Purpose: Help the prospect understand the broader business consequences of their problems.
- "What impact does [problem] have on your team's productivity?"
- "How does this affect your ability to meet quarterly targets?"
- "What is the cost to the business when [problem] goes unresolved?"
- "If this continues for another year, what are the downstream effects?"
- "How does [problem] affect your relationships with customers or partners?"

Best practices for implication questions:
- This is where deals are won or lost. Prospects who understand the full cost of their problem are far more motivated to act.
- Connect problems to strategic business outcomes: revenue, customer retention, competitive positioning, compliance risk, employee satisfaction.
- Be careful not to come across as alarmist. Frame implications as genuine curiosity about business impact rather than fear-mongering.

NEED-PAYOFF QUESTIONS (Solution Vision)
Purpose: Guide the prospect to articulate the value of solving the problem, so they sell themselves on the solution.
- "If you could eliminate [problem], what would that mean for your team?"
- "How would [specific improvement] affect your ability to hit your targets?"
- "What would it be worth to your organisation to reduce [metric] by [amount]?"
- "If this problem were solved, what else could your team focus on?"
- "How would [improvement] change the way your stakeholders view your department?"

Best practices for need-payoff questions:
- Let the prospect describe the value in their own words. Their articulation becomes your value proposition in their language.
- Connect their stated payoffs back to the specific capabilities of your solution without being heavy-handed.
- Use the prospect's need-payoff answers in proposals and business cases to demonstrate that the value case was collaboratively developed rather than imposed.`;

export const QUALIFICATION_SCORING_RUBRIC = `QUALIFICATION SCORING RUBRIC

This rubric defines how to calculate an overall qualification score by combining framework-specific scores with additional contextual signals.

STEP 1: FRAMEWORK SCORE (0-100)
Choose the primary framework based on deal complexity:
- For deals under 50,000 USD or with a single decision-maker, use BANT (4 dimensions, 25 points each, total 100).
- For enterprise deals over 50,000 USD or involving three or more stakeholders, use MEDDIC (6 dimensions, 16-17 points each, total 100).
- Score each dimension independently using the scoring guides above.

STEP 2: CONTEXTUAL MODIFIERS (-15 to +15)
Apply the following adjustments to the framework score:
- Timing signal: If the prospect has a triggering event within 60 days (contract expiry, regulatory deadline, fiscal year end), add +5 points.
- Competitive displacement: If the prospect is currently using a competitor's solution and has expressed dissatisfaction, add +5 points. If the competitor relationship is strong and the prospect is merely benchmarking, subtract -5 points.
- Engagement velocity: If the prospect has responded to outreach within 24 hours on at least two occasions, add +5 points. If the prospect has gone silent for more than 14 days at any point, subtract -5 points.
- Organisational health: If the company is publicly known to be in financial difficulty, undergoing significant restructuring, or has recently announced layoffs in the buying department, subtract -5 to -10 points.
- Champion strength: If the identified champion has executive sponsorship and has successfully sponsored similar purchases before, add +5 points.

STEP 3: FINAL SCORE AND CLASSIFICATION
Calculate: Final Score = Framework Score + Contextual Modifiers (capped at 0-100)

Score ranges and recommended actions:
- 80-100 (Hot): Immediate priority. Accelerate the deal with executive engagement, proposal delivery, and close plan development. Target close within current quarter.
- 60-79 (Warm): Active pursuit. Schedule regular touchpoints, address qualification gaps, and develop a champion. Target close within one to two quarters.
- 40-59 (Cool): Nurture required. The lead has potential but significant gaps remain. Focus on education, relationship building, and monitoring for changes in readiness signals.
- 20-39 (Cold): Low priority. Park in a nurture campaign with automated touchpoints. Revisit if engagement signals improve or triggering events are detected.
- 0-19 (Disqualify): Not a viable opportunity at this time. Document the reasons for disqualification, inform the prospect professionally, and set a calendar reminder to re-evaluate in six months.

HANDLING INCOMPLETE INFORMATION
When scoring dimensions with insufficient data:
- Assign a midpoint score for that dimension (e.g. 12-13 out of 25 for BANT).
- Flag the dimension as "unvalidated" in your output.
- Add a specific discovery question to the recommended next steps that would resolve the information gap.
- Never assign a high score based on assumption. Unverified dimensions should always trend toward the lower half of their range.`;
