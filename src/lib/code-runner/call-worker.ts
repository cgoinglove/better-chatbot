"use client";
import { createDebounce, generateUUID } from "lib/utils";
import {
  CodeRunnerOptions,
  CodeRunnerResult,
  CodeWorkerRequest,
  CodeWorkerResponse,
} from "./code-runner.interface";

export function callCodeRunWorker(
  type: "javascript" | "python",
  option: CodeRunnerOptions,
): Promise<CodeRunnerResult> {
  let tk: NodeJS.Timeout;
  const terminateDebounce = createDebounce();
  const terminate = () => {
    terminateDebounce(() => {
      worker.terminate();
    }, 5000);
  };
  let isWorking = true;
  const worker = new Worker(new URL("./worker.ts", import.meta.url));
  const promise = new Promise<CodeRunnerResult>((resolve) => {
    const id = generateUUID();
    const request: CodeWorkerRequest = {
      id,
      type,
      code: option.code,
      timeout: option.timeout,
    };
    setTimeout(() => {
      worker.postMessage(request);
    }, 1000); // for boot-up effect
    worker.onmessage = (event) => {
      const response = event.data as CodeWorkerResponse;
      if (response.id !== id) return;
      if (response.type === "log") {
        option.onLog?.(response.entry);
        if (!isWorking) terminate();
      } else {
        resolve(response.result as CodeRunnerResult);
        clearTimeout(tk);
        terminate();
      }
    };
  });

  const race = Promise.race([
    promise,
    new Promise<CodeRunnerResult>((timeout) => {
      tk = setTimeout(() => {
        const errorResult: CodeRunnerResult = {
          success: false,
          logs: [
            {
              type: "error",
              args: [
                {
                  type: "data",
                  value: JSON.stringify({
                    type: "error",
                    message: "Timeout",
                  }),
                },
              ],
            },
          ],
          error: "Timeout",
        };
        timeout(errorResult);
        terminate();
      }, option.timeout || 40000);
    }),
  ]);

  return race.finally(() => {
    isWorking = false;
  });
}
