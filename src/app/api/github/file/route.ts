import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
  try {
    const { repo, ref, token, path } = await req.json();
    if (!repo || !ref || !token || !path) {
      return Response.json(
        { error: "repo, ref, token, path required" },
        { status: 400 },
      );
    }
    const url = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`;
    const gh = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });
    const json = await gh.json();
    if (!gh.ok) {
      return Response.json(
        { error: json?.message || gh.statusText },
        { status: gh.status },
      );
    }
    // Content is base64
    let content = "";
    if (json?.content) {
      try {
        content = Buffer.from(json.content, "base64").toString("utf-8");
      } catch {}
    }
    return Response.json({ content });
  } catch (e: any) {
    return Response.json(
      { error: e.message || "Unknown error" },
      { status: 500 },
    );
  }
};
