import { customModelProvider } from "../src/lib/ai/models";

console.log("Testing AWS Bedrock Integration...\n");

// Get all providers
const providersInfo = customModelProvider.modelsInfo;

// Find bedrock provider
const bedrockProvider = providersInfo.find((p) => p.provider === "bedrock");

if (!bedrockProvider) {
  console.log("❌ Bedrock provider not found");
  console.log(
    "Available providers:",
    providersInfo.map((p) => p.provider).join(", "),
  );
  process.exit(1);
}

console.log("✅ Bedrock provider initialized");
console.log(`✅ Has API Key: ${bedrockProvider.hasAPIKey}`);
console.log(`✅ Total Models: ${bedrockProvider.models.length}\n`);

// List Claude models
console.log("Claude Models:");
bedrockProvider.models
  .filter((m) => m.name.startsWith("claude-"))
  .forEach((model) => {
    const toolSupport = model.isToolCallUnsupported ? "❌" : "✅";
    const imageSupport = model.isImageInputUnsupported ? "❌" : "✅";
    console.log(`  ${model.name}`);
    console.log(`    Tools: ${toolSupport} | Images: ${imageSupport}`);
  });

// List Llama models
console.log("\nLlama Models:");
bedrockProvider.models
  .filter((m) => m.name.startsWith("llama-"))
  .forEach((model) => {
    const toolSupport = model.isToolCallUnsupported ? "❌" : "✅";
    console.log(`  ${model.name} - Tools: ${toolSupport}`);
  });

console.log("\n✅ AWS Bedrock integration test completed successfully!");
