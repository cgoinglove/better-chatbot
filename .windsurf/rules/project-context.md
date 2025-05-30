---
trigger: always_on
---

---

## trigger: always_on

# Project Context

This is MCP Client Chatbot, a very nice project.
In inspiration/ai-chatbot is another nice project, the reference chatbot from Vercel

We are porting features from ai-chatbot to MCP Client Chatbot

They have similar architectures, though this project, MCP Client Chatbot, recently switched from next-auth to better-auth. And they have different model selection mechanisms. I have already ported in all the components/ui which is shadcn/ui.

We are porting in the artifacts feature. It is mostly in place.

We are fixing the problems, the incomplete and missing parts of the implementation.

Focus on fixing things and do NOT get hung up on TS errors until I have verified everything WORKS.

Our approach to porting this feature has been:

- remember that OUR project DID work and DOES work on main, but we broke it on this branch when we started porting in things from ai-chatbot, which itself works perfectly.
- So do not improvise new files when you can copy WORKING source project files and then adjust in-place
- focus on getting things WORKING, verified by ME the user. Don't get distracted by TS errors that are non-blocking

Remember that this project is backed by git and git has answers to questions about what works on main and what we changed and broke since.

Your code seems to lead you to do things in small increments but sometimes a file has TONS of TS issues and you just need to use a larger window for reading/writing fixes otherwise you will be fixing/breaking/fixing forever. Be intelligent about when and how to fix TS issues. Not tiny incrementalist. Find themes of breakage and root causes.

I will run the dev server, not you.

db is under lib/db/pg/db.pg.ts rather than where you would ordinarily look.
