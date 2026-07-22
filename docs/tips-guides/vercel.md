# Vercel Deployment Guide

The easiest way to get started with **better-chatbot** is to deploy it directly to Vercel.
You only need **one AI Provider API Key** (OpenAI, Gemini, Claude, etc.) to run the app.
Database, file storage, and caching are all available on free tiers.

---

## Steps

1. **Click this button** to start the deployment process:
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cgoinglove/better-chatbot&env=BETTER_AUTH_SECRET&env=OPENAI_API_KEY&env=GOOGLE_GENERATIVE_AI_API_KEY&env=ANTHROPIC_API_KEY&envDescription=BETTER_AUTH_SECRET+is+required+%28enter+any+secret+value%29.+At+least+one+LLM+provider+API+key+%28OpenAI,+Claude,+or+Google%29+is+required,+but+you+can+add+all+of+them.+See+the+link+below+for+details.&envLink=https://github.com/cgoinglove/better-chatbot/blob/main/.env.example&demo-title=better-chatbot&demo-description=An+Open-Source+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&products=[{%22type%22:%22integration%22,%22protocol%22:%22storage%22,%22productSlug%22:%22neon%22,%22integrationSlug%22:%22neon%22},{%22type%22:%22integration%22,%22protocol%22:%22storage%22,%22productSlug%22:%22upstash-kv%22,%22integrationSlug%22:%22upstash%22},{%22type%22:%22blob%22}])

2. **Click the "Create" button** on Vercel to begin setting up your project.

   <img width="1254" alt="step2" src="https://github.com/user-attachments/assets/66806fa8-2d55-4e57-ad7e-2f37ef037a97" />

3. **Add all required resources.**
   When prompted, add:

   - **Database (Neon Postgres)**
   - **Blob Storage (Vercel Blob)**
   - **Redis (Upstash KV)**
     All of these are available with free-tier plans.

   <img width="1156" height="876" alt="step3" src="https://github.com/user-attachments/assets/55b2de40-9006-42f8-89e2-dbfc511c4bc6" />

4. **Set Environment Variables.**

   - You must enter a value for **BETTER_AUTH_SECRET** (any random string is fine). You can generate one [here](https://auth-secret-gen.vercel.app/).
   - Enter your **AI Provider API Key(s)**. Only one is required to start (OpenAI, Google Gemini, or Anthropic Claude).
   - You can use placeholder values and update them later in **Project Settings > Environments** after deployment.

    <img width="989" height="607" alt="step4" src="https://github.com/user-attachments/assets/1778265e-da49-433b-8724-88e8b71dea21" />

5. **Deploy your project.**
   Once everything is set, Vercel will automatically build and deploy your project.

6. **Update API Keys and Settings (optional).**
   After deployment, go to **Settings > Environments** to add or update your API keys and configuration.

   - Example environment file: [example.env](https://github.com/cgoinglove/better-chatbot/blob/main/.env.example)
   - You can customize authentication, signup/login, and other options by editing your environment variables here.

   <img width="1712" alt="step6" src="https://github.com/user-attachments/assets/2d197389-a865-46ac-9156-40cad64258ca" />

## Optional AgentPond tracing

To export OpenInference AI traces directly to a private Vercel Blob store,
initialize AgentPond 0.6 from the project root:

```bash
npx agentpond@0.6.0 init --platform vercel
```

Follow the generated prompt, ensure the connected Blob store is private,
enable access to Vercel System Environment Variables, and set
`AGENTPOND_ENABLED=true`. The integration is disabled by default and does not
add an ingestion endpoint.

The AI SDK telemetry settings explicitly enable `recordInputs` and
`recordOutputs`. This records input and output values for each instrumented
call, which may include prompts, messages, tool data, and generated content. A
private Blob store restricts access but does not redact these values. Review
the [Vercel AI SDK telemetry documentation](https://ai-sdk.dev/docs/ai-sdk-core/telemetry)
before enabling tracing.

After exercising an AI request, inspect the selected Vercel target:

```bash
npx agentpond@0.6.0 sync
npx agentpond@0.6.0 traces list --limit 10
```

---

## Notes

- To enable **web search**, you can request an API key from [Exa](https://dashboard.exa.ai). A free tier is available.
- Only Remote (SSE, Streamable) MCP servers are supported. STDIO-based servers are not supported on Vercel (consider Docker or Render if needed).
- Check `.env.example` for all available settings.
