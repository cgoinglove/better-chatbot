// Next.js environment configuration
// This ensures environment variables are properly loaded in Next.js

// Define the environment variables we want to expose to the browser
export const publicRuntimeConfig = {
  // Add any environment variables you want to expose to the browser here
};

// Define the environment variables we want to keep server-side only
export const serverRuntimeConfig = {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  XAI_API_KEY: process.env.XAI_API_KEY,
};

// Helper function to check if environment variables are properly loaded
export function checkEnvVars() {
  const requiredVars = [
    'OPENROUTER_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'XAI_API_KEY',
  ];
  
  const missingVars = requiredVars.filter(
    (varName) => !process.env[varName]
  );
  
  if (missingVars.length > 0) {
    console.warn(`Missing environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
}
