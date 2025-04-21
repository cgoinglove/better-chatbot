// Environment variable loader
// This ensures environment variables are properly loaded and available throughout the application

// Define the environment variables we expect to use
interface EnvVars {
  OPENROUTER_API_KEY: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  XAI_API_KEY: string;
}

// Get environment variables with fallbacks
export const env: EnvVars = {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  XAI_API_KEY: process.env.XAI_API_KEY || '',
};

// Log environment variable status (for debugging)
export function logEnvStatus() {
  console.log('Environment Variables Status:');
  Object.entries(env).forEach(([key, value]) => {
    console.log(`${key}: ${value ? '[Set]' : '[Not Set]'}`);
  });
}
