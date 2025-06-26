import { DBEdge, DBNode, DBWorkflow } from "app-types/workflow";
import { generateUUID } from "lib/utils";

export const StoryGenerator = (): {
  workflow: Partial<DBWorkflow>;
  nodes: Partial<DBNode>[];
  edges: Partial<DBEdge>[];
} => {
  const workflow: Partial<DBWorkflow> = {
    description:
      "Generate creative stories with customizable characters, settings, and plot element",
    name: "Story Generator",
    isPublished: false,
    visibility: "private",
    icon: {
      type: "emoji",
      value:
        "https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f4d6.png",
      style: {
        backgroundColor: "oklch(83.7% 0.128 66.29)",
      },
    },
  };

  const CharacterBuilderID = generateUUID();
  const PlotArchitectID = generateUUID();
  const StoryWriterID = generateUUID();
  const ConflictDesignerID = generateUUID();
  const InputID = generateUUID();
  const SceneBuilderID = generateUUID();
  const WorldBuilderID = generateUUID();
  const ConditionID = generateUUID();
  const OutputID = generateUUID();

  const nodes: Partial<DBNode>[] = [
    {
      id: CharacterBuilderID,
      kind: "llm",
      name: "Character Builder",
      description:
        "Create detailed character profiles when character count is specified\n\ncharacter_count > 0",
      uiConfig: {
        position: { x: 308.4002568927934, y: 63.302183262057326 },
        type: "default",
      },
      nodeConfig: {
        kind: "llm",
        outputSchema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            totalTokens: { type: "number" },
          },
        },
        messages: [
          {
            role: "system",
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "You are a creative character designer. Create ",
                    },
                    {
                      type: "mention",
                      attrs: {
                        id: "e3e7e805-c37f-4032-8afd-5d7dd915de3a",
                        label: `{"nodeId":"${InputID}","path":["character_count"]}`,
                      },
                    },
                    {
                      type: "text",
                      text: " compelling main characters for a ",
                    },
                    {
                      type: "mention",
                      attrs: {
                        id: "a85435f3-774a-4afe-becb-bafe9b2ddec5",
                        label: `{"nodeId":"${InputID}","path":["genre"]}`,
                      },
                    },
                    { type: "text", text: " story." },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "For each character, provide:" },
                  ],
                },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "- Name and age" }],
                },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "- Personality traits" }],
                },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "- Background/history" }],
                },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "- Key motivations" }],
                },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "- Unique characteristics" }],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Mood/tone: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "7564300a-0530-491d-83cb-a39fc746d98f",
                        label: `{"nodeId":"${InputID}","path":["mood"]}`,
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Make them diverse and interesting.",
                    },
                  ],
                },
              ],
            },
          },
        ],
        model: { provider: "openai", model: "4o" },
      },
    },
    {
      id: PlotArchitectID,
      kind: "llm",
      name: "Plot Architect",
      description: "Create main story structure and plot points",
      uiConfig: {
        position: { x: 1101.2331930874202, y: -266.16211607417085 },
        type: "default",
      },
      nodeConfig: {
        kind: "llm",
        outputSchema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            totalTokens: { type: "number" },
          },
        },
        messages: [
          {
            role: "system",
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Create a " },
                    {
                      type: "mention",
                      attrs: {
                        id: "85f5980f-8854-4e4b-93ac-39a2426e1cd8",
                        label: `{"nodeId":"${InputID}","path":["length"]}`,
                      },
                    },
                    { type: "text", text: " " },
                    {
                      type: "mention",
                      attrs: {
                        id: "cc690f91-9dc2-45da-8a69-dddb770d7ee6",
                        label: `{"nodeId":"${InputID}","path":["genre"]}`,
                      },
                    },
                    { type: "text", text: " plot outline." },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Characters: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "5e9f5d82-2522-48cb-b0d3-c301fb612b6e",
                        label: `{"nodeId":"${CharacterBuilderID}","path":["answer"]}`,
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Setting: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "5c776c16-a3f7-47b4-a76c-4d14a55343d9",
                        label: `{"nodeId":"${WorldBuilderID}","path":["answer"]}`,
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Mood: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "cace68ed-8228-4af2-918a-425ac404a2ef",
                        label: `{"nodeId":"${InputID}","path":["mood"]}`,
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Include: opening, 2-3 key events, climax, resolution.",
                    },
                  ],
                },
              ],
            },
          },
        ],
        model: { provider: "openai", model: "4o" },
      },
    },
    {
      id: ConditionID,
      kind: "condition",
      name: "CONDITION",
      description: "Character Count Condition",
      uiConfig: {
        position: { x: -27.028360139028436, y: -104.35710539004253 },
        type: "default",
      },
      nodeConfig: {
        kind: "condition",
        outputSchema: { type: "object", properties: {} },
        branches: {
          if: {
            id: "if",
            logicalOperator: "AND",
            type: "if",
            conditions: [
              {
                source: {
                  nodeId: InputID,
                  path: ["character_count"],
                  nodeName: "INPUT",
                  type: "number",
                },
                operator: "less_than",
                value: "3",
              },
            ],
          },
          else: {
            id: "else",
            logicalOperator: "AND",
            type: "else",
            conditions: [],
          },
        },
      },
    },
    {
      id: StoryWriterID,

      kind: "llm",
      name: "Story Writer",
      description: "Generate complete story from all elements",
      uiConfig: {
        position: { x: 1498.6897898247882, y: -74.160195078909 },
        type: "default",
      },
      nodeConfig: {
        kind: "llm",
        outputSchema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            totalTokens: { type: "number" },
          },
        },
        messages: [
          {
            role: "system",
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Write a complete " },
                    {
                      type: "mention",
                      attrs: {
                        id: "b557216f-2d22-4431-ad9c-ffae9bc998fd",
                        label: `{"nodeId":"${InputID}","path":["genre"]}`,
                      },
                    },
                    { type: "text", text: " story using:" },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Characters: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "e158b67c-aafe-4304-8cf5-674bea2e6f62",
                        label: `{"nodeId":"${CharacterBuilderID}","path":["answer"]}`,
                      },
                    },
                    { type: "hardBreak" },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Setting: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "f9968802-4eaf-498b-a960-911ffa65a9fb",
                        label: `{"nodeId":"${WorldBuilderID}","path":["answer"]}`,
                      },
                    },
                    { type: "hardBreak" },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Plot: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "7e7bf05f-b866-4007-83c1-3dadf161c65d",
                        label: `{"nodeId":"${PlotArchitectID}","path":["answer"]}`,
                      },
                    },
                    { type: "hardBreak" },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Conflicts: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "9ddf4c8b-3007-475d-aa10-1011f99922c0",
                        label: `{"nodeId":"${ConflictDesignerID}","path":["answer"]}`,
                      },
                    },
                    { type: "hardBreak" },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Key Scenes: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "605388c1-9075-4c78-8241-11252e034ca6",
                        label: `{"nodeId":"${SceneBuilderID}","path":["answer"]}`,
                      },
                    },
                    { type: "hardBreak" },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Length: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "96565bf4-b9c0-41ab-bd0f-6e516b4ee7d9",
                        label: `{"nodeId":"${InputID}","path":["length"]}`,
                      },
                    },
                    { type: "text", text: ", Mood: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "15936d01-8ad8-4774-9e6f-a6eb057a495c",
                        label: `{"nodeId":"${InputID}","path":["mood"]}`,
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Create an engaging, well-structured story.",
                    },
                  ],
                },
              ],
            },
          },
        ],
        model: { provider: "openai", model: "4o" },
      },
    },
    {
      id: ConflictDesignerID,

      kind: "llm",
      name: "Conflict Designer",
      description: "Design central conflicts and tensions",
      uiConfig: {
        position: { x: 1108.183215154581, y: -70.75046594404336 },
        type: "default",
      },
      nodeConfig: {
        kind: "llm",
        outputSchema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            totalTokens: { type: "number" },
          },
        },
        messages: [
          {
            role: "system",
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Create compelling conflicts for this ",
                    },
                    {
                      type: "mention",
                      attrs: {
                        id: "1d6ba6b2-e065-4328-ac73-36680e5f9167",
                        label: `{"nodeId":"${InputID}","path":["genre"]}`,
                      },
                    },
                    { type: "text", text: "story." },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Characters: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "305c95db-a2b0-4003-92e0-61194e56b8ab",
                        label: `{"nodeId":"${CharacterBuilderID}","path":["answer"]}`,
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Setting: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "0633fcef-1303-4032-9185-fcdd58c83441",
                        label: `{"nodeId":"${WorldBuilderID}","path":["answer"]}`,
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Mood: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "af4600dc-9720-4573-8571-316aee2488eb",
                        label: `{"nodeId":"${InputID}","path":["mood"]}`,
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Focus on: main conflict, character tensions, obstacles.",
                    },
                  ],
                },
              ],
            },
          },
        ],
        model: { provider: "openai", model: "gpt-4.1" },
      },
    },
    {
      id: OutputID,

      kind: "output",
      name: "OUTPUT",
      description: "",
      uiConfig: {
        position: { x: 1870.4703795308747, y: -69.14887502224008 },
        type: "default",
      },
      nodeConfig: {
        kind: "output",
        outputSchema: { type: "object", properties: {} },
        outputData: [
          {
            key: "result",
            source: {
              nodeId: StoryWriterID,
              path: ["answer"],
            },
          },
        ],
      },
    },
    {
      id: WorldBuilderID,

      kind: "llm",
      name: "World Builder",
      description: "Develop the story's setting and world details",
      uiConfig: {
        position: { x: 689.4182403040296, y: -71.40729287046425 },
        type: "default",
      },
      nodeConfig: {
        kind: "llm",
        outputSchema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            totalTokens: { type: "number" },
          },
        },
        messages: [
          {
            role: "system",
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Create a vivid and immersive world/setting for a ",
                    },
                    {
                      type: "mention",
                      attrs: {
                        id: "e6243827-9273-4d08-9d36-6bc69aa949e5",
                        label: `{"nodeId":"${InputID}","path":["genre"]}`,
                      },
                    },
                    { type: "text", text: " story." },
                    { type: "hardBreak" },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Based on this setting: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "6234dfea-6c27-4522-891b-c47cfc911973",
                        label: `{"nodeId":"${InputID}","path":["setting"]}`,
                      },
                    },
                    { type: "hardBreak" },
                  ],
                },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Include:" }],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "- Time period and location" },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "- Atmosphere and environment  " },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "- Cultural/social context" },
                  ],
                },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "- Important locations" }],
                },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "- World-building details" }],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Mood: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "2f562eab-c04f-4773-92a6-7a1a681d21b4",
                        label: `{"nodeId":"${InputID}","path":["mood"]}`,
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Genre: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "9972d3ad-6952-4fa5-8272-cc78e6ae7950",
                        label: `{"nodeId":"${InputID}","path":["genre"]}`,
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
        model: { provider: "openai", model: "4o" },
      },
    },
    {
      id: SceneBuilderID,

      kind: "llm",
      name: "Scene Builder",
      description: "Plan key scenes and story moments",
      uiConfig: {
        position: { x: 1103.3388398079421, y: 113.52156706293383 },
        type: "default",
      },
      nodeConfig: {
        kind: "llm",
        outputSchema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            totalTokens: { type: "number" },
          },
        },
        messages: [
          {
            role: "system",
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Design 3-5 key scenes for this " },
                    {
                      type: "mention",
                      attrs: {
                        id: "d8e4102c-f619-43a5-92ff-0066b44ab38e",
                        label: `{"nodeId":"${InputID}","path":["genre"]}`,
                      },
                    },
                    { type: "text", text: " story." },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Characters: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "7db6c009-a6aa-4885-9309-9609c0743efb",
                        label: `{"nodeId":"${CharacterBuilderID}","path":["answer"]}`,
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Setting: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "b8268c2b-ebc5-4bea-be26-be07e53b672c",
                        label: `{"nodeId":"${WorldBuilderID}","path":["answer"]}`,
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    { type: "text", text: "Mood: " },
                    {
                      type: "mention",
                      attrs: {
                        id: "2910adb7-30a2-4762-a67e-e2215c35418b",
                        label: `{"nodeId":"${InputID}","path":["mood"]}`,
                      },
                    },
                  ],
                },
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "Create vivid, impactful scenes that drive the story forward.",
                    },
                  ],
                },
              ],
            },
          },
        ],
        model: { provider: "openai", model: "4o" },
      },
    },
    {
      id: generateUUID(),

      kind: "note",
      name: "NOTE",
      description:
        '# 📖 Story Generator Workflow\n\n## ✨ What this workflow does\nThis workflow creates **complete stories** with rich characters, detailed worlds, and engaging plots.\n\n## 🎯 How to use\n1. **Run this workflow** from chat\n2. **Provide required inputs:**\n   - `genre`: fantasy, romance, mystery, sci-fi, thriller, adventure\n   - `length`: short, medium, long\n3. **Optional inputs:**\n   - `character_count`: Number for detailed character development\n   - `setting`: Custom time/place (e.g., "Victorian London", "Space station")\n   - `mood`: Story tone (e.g., "dark and mysterious", "lighthearted")\n\n## 🔄 Workflow Process\n- **Parallel processing** for efficiency\n- **Conditional character building** (only if character_count provided)\n- **3-stage story development:**\n  - Plot structure\n  - Conflict design  \n  - Key scenes\n- **Final integration** into complete story\n\n## 💡 Example Usage',
      uiConfig: {
        position: { x: 363.73120024327585, y: -1282.703854875699 },
        type: "default",
      },
      nodeConfig: {
        kind: "note",
        outputSchema: { type: "object", properties: {} },
      },
    },
    {
      id: InputID,

      kind: "input",
      name: "INPUT",
      description: "Collect story requirements and preferences from user",
      uiConfig: {
        position: { x: -396.79016064789573, y: -105.10673699322741 },
        type: "default",
      },
      nodeConfig: {
        kind: "input",
        outputSchema: {
          type: "object",
          properties: {
            genre: {
              type: "string",
              enum: [
                "fantasy",
                "romance",
                "mystery",
                "sci-fi",
                "thriller",
                "adventure",
              ],
              description: "Story genre",
            },
            length: {
              type: "string",
              enum: ["short", "medium", "long"],
              description: "Story length preference",
            },
            character_count: {
              type: "number",
              description: "Number of main characters",
            },
            setting: {
              type: "string",
              description: "Story setting or time period",
            },
            mood: { type: "string", description: "Story mood/tone" },
          },
          required: ["length", "genre"],
          default: "short",
        },
      },
    },
  ];

  const edges: Partial<DBEdge>[] = [
    {
      source: ConditionID,
      target: CharacterBuilderID,
      uiConfig: { sourceHandle: "else", targetHandle: "left" },
    },
    {
      source: CharacterBuilderID,
      target: WorldBuilderID,
      uiConfig: {},
    },
    {
      source: StoryWriterID,
      target: OutputID,
      uiConfig: {},
    },
    {
      source: ConditionID,
      target: WorldBuilderID,
      uiConfig: { sourceHandle: "if", targetHandle: "left" },
    },
    {
      source: PlotArchitectID,
      target: StoryWriterID,
      uiConfig: { sourceHandle: "right", targetHandle: "left" },
    },
    {
      source: WorldBuilderID,
      target: ConflictDesignerID,
      uiConfig: {},
    },
    {
      source: ConflictDesignerID,
      target: StoryWriterID,
      uiConfig: {},
    },
    {
      source: SceneBuilderID,
      target: StoryWriterID,
      uiConfig: { sourceHandle: "right", targetHandle: "left" },
    },
    {
      source: WorldBuilderID,
      target: SceneBuilderID,
      uiConfig: {},
    },
    {
      source: InputID,
      target: ConditionID,
      uiConfig: {},
    },
    {
      source: WorldBuilderID,
      target: PlotArchitectID,
      uiConfig: {},
    },
  ].map((v) => ({
    ...v,
    id: generateUUID(),
  }));

  return { workflow, nodes, edges };
};
