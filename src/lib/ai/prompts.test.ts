import { describe, expect, it } from "vitest";
import { buildUserSystemPrompt } from "./prompts";
import { AgentSummary, Agent } from "app-types/agent";

describe("buildUserSystemPrompt", () => {
  const mockAvailableAgents: AgentSummary[] = [
    {
      id: "agent-1",
      name: "Code Reviewer",
      description: "Reviews code for best practices",
      userId: "user-1",
      visibility: "private",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "agent-2",
      name: "Technical Writer",
      description: "Writes documentation",
      userId: "user-1",
      visibility: "public",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "agent-3",
      name: "Simple Agent",
      // No description
      userId: "user-1",
      visibility: "private",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockSelectedAgent: Agent = {
    id: "selected-agent",
    name: "Selected Agent",
    description: "The currently selected agent",
    userId: "user-1",
    visibility: "private",
    createdAt: new Date(),
    updatedAt: new Date(),
    instructions: {
      role: "Testing Expert",
      systemPrompt: "You are a testing expert.",
    },
  };

  describe("available agents section", () => {
    it("should include available agents when no agent is selected", () => {
      const prompt = buildUserSystemPrompt(
        undefined,
        undefined,
        undefined,
        mockAvailableAgents,
      );

      expect(prompt).toContain("<available_agents>");
      expect(prompt).toContain("</available_agents>");
      expect(prompt).toContain(
        "**Code Reviewer**: Reviews code for best practices",
      );
      expect(prompt).toContain("**Technical Writer**: Writes documentation");
      expect(prompt).toContain("**Simple Agent**");
      expect(prompt).toContain("typing @ followed by the agent name");
      expect(prompt).toContain("from the tools menu");
      expect(prompt).toContain("agents menu in the sidebar");
    });

    it("should not include available agents section when an agent is selected", () => {
      const prompt = buildUserSystemPrompt(
        undefined,
        undefined,
        mockSelectedAgent,
        mockAvailableAgents,
      );

      expect(prompt).not.toContain("<available_agents>");
      expect(prompt).not.toContain("</available_agents>");
      // Should include the selected agent's instructions instead
      expect(prompt).toContain("Selected Agent");
      expect(prompt).toContain("Testing Expert");
    });

    it("should not include available agents section when list is empty", () => {
      const prompt = buildUserSystemPrompt(undefined, undefined, undefined, []);

      expect(prompt).not.toContain("<available_agents>");
      expect(prompt).not.toContain("</available_agents>");
    });

    it("should not include available agents section when list is undefined", () => {
      const prompt = buildUserSystemPrompt(
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(prompt).not.toContain("<available_agents>");
      expect(prompt).not.toContain("</available_agents>");
    });

    it("should handle agents without descriptions", () => {
      const prompt = buildUserSystemPrompt(undefined, undefined, undefined, [
        {
          id: "no-desc",
          name: "No Description Agent",
          userId: "user-1",
          visibility: "private",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      expect(prompt).toContain("**No Description Agent**");
      // Should not have a colon after the name when no description
      expect(prompt).not.toContain("**No Description Agent**:");
    });
  });
});
