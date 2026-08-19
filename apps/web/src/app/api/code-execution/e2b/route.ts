import { requireBillingContext } from "@/lib/gate";
import { withAuth } from "auth/route-guard";
import { type E2BStagedFile, e2bRun } from "lib/code-runner/e2b-run";
import { collectThreadAttachments } from "lib/code-runner/stage-attachments";
import logger from "lib/logger";
import { NextResponse } from "next/server";
import { z } from "zod";

// Fluid Compute allows 300s by default; sandbox cold-start + code execution can
// exceed the platform-minimum 60s.
export const maxDuration = 300;

const requestSchema = z.object({
  code: z.string().min(1).max(200_000),
  type: z.enum(["javascript", "python"]),
  timeout: z.number().int().min(1000).max(60_000).optional(),
  // When present, the thread's uploaded attachments are staged into the sandbox
  // so code can open them by name. Ownership is verified server-side.
  threadId: z.string().min(1).max(256).optional(),
});

export const POST = withAuth(async (req, session) => {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { code, type, timeout, threadId } = parsed.data;
  const billing = await requireBillingContext();

  // Stage the thread's attachments into the sandbox. Best-effort: a failure
  // here must not block code execution — the code simply runs without the files.
  let files: E2BStagedFile[] = [];
  if (threadId) {
    try {
      files = await collectThreadAttachments(threadId, session.user.id);
    } catch (err) {
      logger.warn(
        `[e2b] attachment staging failed threadId=${threadId} error=${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const result = await e2bRun(
    code,
    type,
    {
      userId: session.user.id,
      customerId: billing.customerId,
      entityId: billing.entityId,
    },
    timeout,
    files,
  );
  return NextResponse.json(result);
});
