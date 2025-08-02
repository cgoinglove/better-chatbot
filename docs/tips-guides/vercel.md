# Vercel Deployment Guide

1. **Click this button** to start the deployment process:

   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cgoinglove/better-chatbot&env=OPENAI_API_KEY&env=BETTER_AUTH_SECRET&envDescription=Learn+more+about+how+to+get+the+API+Keys+for+the+application&envLink=https://github.com/cgoinglove/better-chatbot/blob/main/.env.example&demo-title=better-chatbot&demo-description=An+Open-Source+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&products=[{"type":"integration","protocol":"storage","productSlug":"neon","integrationSlug":"neon"}])

2. **Click the "Create" button** on Vercel to begin setting up your project.

   <img width="1254" alt="step2" src="https://github.com/user-attachments/assets/66806fa8-2d55-4e57-ad7e-2f37ef037a97" />


3. **Add Neon Postgres and create a database.**
   Click the "Neon Postgres Add" button to create a database. This is available even on the free plan.

   <img width="1329" alt="step3" src="https://github.com/user-attachments/assets/d0f3848e-e45b-4c20-843e-7c452c297e51" />


4. **Add Environment Variables.**
   You can enter placeholder values for the environment variables at this stage, or use the actual values if you have them ready. If you prefer, you can enter temporary values now and update them later in the project's settings after deployment is complete. However, **BETTER_AUTH_SECRET** must be set at this stage.

   - You can generate an BETTER_AUTH_SECRET [here](https://auth-secret-gen.vercel.app/).

    <img width="1469" alt="step4" src="https://github.com/user-attachments/assets/a0ca9aab-e32a-42ff-8714-707cda387c2a" />


5. **Deployment and Project Creation.**
   Once the above steps are complete, deployment will begin automatically and your project will be created.

6. **Enter LLM Provider API Keys in Project Settings.**
   After deployment, go to your project's **Settings > Environments** tab. Here, enter the API keys for the LLM providers you wish to use. You only need to enter the keys for the providers you actually plan to use—other fields can be left blank or filled with dummy values.

   - Example environment file: [example.env](https://github.com/cgoinglove/better-chatbot/blob/main/.env.example)
     
   <img width="1712" alt="step6" src="https://github.com/user-attachments/assets/2d197389-a865-46ac-9156-40cad64258ca" />


## Notes

- Only Remote(sse, streamable) MCP servers are supported (STDIO-based servers are not).
- If you need STDIO support, consider using Docker or Render.
