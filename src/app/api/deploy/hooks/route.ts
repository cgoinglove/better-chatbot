import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return Response.json({ error: "Invalid URL" }, { status: 400 });
    }
    const res = await fetch(url, { method: "POST" });
    const text = await res.text();
    return Response.json({ status: res.status, body: text });
  } catch (e: any) {
    return Response.json(
      { error: e.message || "Unknown error" },
      { status: 500 },
    );
  }
};
