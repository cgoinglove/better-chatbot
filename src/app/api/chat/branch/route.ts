import { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  try {
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
      },
    );
  }
}
