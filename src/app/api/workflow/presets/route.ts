export const GET = async () => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/workflow-presets.json`,
    ).catch(() => null);
    if (res && res.ok) {
      const json = await res.json();
      return Response.json(json);
    }
  } catch {}
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const p = path.join(process.cwd(), "public", "workflow-presets.json");
    const data = await fs.readFile(p, "utf-8");
    return new Response(data, {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return Response.json({ error: e.message || "Not found" }, { status: 404 });
  }
};
