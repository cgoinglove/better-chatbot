import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "auth/server";
import { serverFileStorage } from "lib/file-storage";

const requestSchema = z.object({
  filename: z.string().min(1, "filename is required"),
  contentType: z.string().min(1, "contentType is required"),
  expiresInSeconds: z
    .number()
    .int()
    .positive()
    .max(60 * 60, "expiresInSeconds must be <= 3600")
    .optional(),
});

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (typeof serverFileStorage.createUploadUrl !== "function") {
    return NextResponse.json(
      {
        error:
          "Presigned uploads are not supported for the current storage driver.",
      },
      { status: 501 },
    );
  }

  try {
    const uploadUrl = await serverFileStorage.createUploadUrl?.(parsed.data);

    if (!uploadUrl) {
      return NextResponse.json(
        { error: "Presigned upload URL could not be generated." },
        { status: 500 },
      );
    }

    return NextResponse.json(uploadUrl);
  } catch (error) {
    console.error("Failed to create upload URL", error);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 },
    );
  }
}
