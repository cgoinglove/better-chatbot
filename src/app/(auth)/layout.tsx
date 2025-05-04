import { Think } from "ui/think";

export default function AuthLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <main className="relative w-full flex flex-col h-screen">
      <div className="flex-1">
        <div className="flex min-h-screen w-full">
          <div className="hidden lg:flex lg:w-1/2 bg-muted border-r flex-col p-18">
            <h1 className="text-xl font-semibold flex items-center gap-3">
              <Think />

              <span>Chat Bot</span>
            </h1>
            <div className="flex-1" />
            <p className=" mb-4 text-muted-foreground">
              Welcome to MCP Chat Bot. Sign in to experience our
              <span className="text-foreground ml-1">
                AI-powered conversational tools.
              </span>
            </p>
          </div>

          <div className="w-full lg:w-1/2 p-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
