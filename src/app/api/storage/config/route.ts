import { isFileStorageConfigured } from "@/lib/file-storage/is-storage-configured";
import { NextResponse } from "next/server";

export async function GET() {
  const configured = isFileStorageConfigured();
  return NextResponse.json({ configured });
}
