import "server-only";

/** Result of executing LLM-generated code. */
export interface ExecuteResult {
  result: unknown;
  error?: string;
  logs?: string[];
}

/** Runs LLM-generated code in a sandbox with tool functions. */
export interface Executor {
  execute(
    code: string,
    fns: Record<string, (...args: unknown[]) => Promise<unknown>>,
  ): Promise<ExecuteResult>;
}

/**
 * A simple Node.js executor that runs LLM-generated code using AsyncFunction.
 * Code runs in the same process — no network isolation.
 * Suitable for development / non-Cloudflare deployments.
 */
export class NodeVMExecutor implements Executor {
  async execute(
    code: string,
    fns: Record<string, (...args: unknown[]) => Promise<unknown>>,
  ): Promise<ExecuteResult> {
    const logs: string[] = [];
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("codemode", "console", `return (${code})()`) as (
        codemode: typeof fns,
        console: typeof capturedConsole,
      ) => Promise<unknown>;

      const capturedConsole = {
        log: (...args: unknown[]) =>
          logs.push(args.map((a) => String(a)).join(" ")),
        warn: (...args: unknown[]) =>
          logs.push("[warn] " + args.map((a) => String(a)).join(" ")),
        error: (...args: unknown[]) =>
          logs.push("[error] " + args.map((a) => String(a)).join(" ")),
        info: (...args: unknown[]) =>
          logs.push("[info] " + args.map((a) => String(a)).join(" ")),
      };

      const result = await fn(fns, capturedConsole);
      return { result, logs };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { result: undefined, error: message, logs };
    }
  }
}

/**
 * Returns a codemode Executor based on the CODEMODE_EXECUTOR env var.
 *
 * - `"node"` (default): NodeVMExecutor — simple AsyncFunction, same process.
 * - `"cloudflare"`: DynamicWorkerExecutor — requires Cloudflare Workers env
 *   and a LOADER binding. Configure `CLOUDFLARE_LOADER_BINDING` if needed.
 */
export function getCodemodeExecutor(): Executor {
  const executorType = process.env.CODEMODE_EXECUTOR ?? "node";

  if (executorType === "cloudflare") {
    throw new Error(
      "Cloudflare DynamicWorkerExecutor requires a Cloudflare Workers runtime. " +
        "Set CODEMODE_EXECUTOR=node for Next.js deployments, or implement a " +
        "custom Executor wrapping DynamicWorkerExecutor for Cloudflare.",
    );
  }

  // default: "node"
  return new NodeVMExecutor();
}
