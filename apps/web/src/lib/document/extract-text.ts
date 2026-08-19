import mammoth from "mammoth";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { extractText } = await import("unpdf");
  const { text } = await extractText(new Uint8Array(buffer), {
    mergePages: true,
  });
  return text;
}

export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const { value: text } = await mammoth.extractRawText({ buffer });
  return text;
}

export async function extractText(
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const ct = contentType.toLowerCase();
  if (ct.includes("pdf")) {
    return extractTextFromPdf(buffer);
  }
  if (
    ct.includes("wordprocessingml") ||
    ct.includes("docx") ||
    ct.includes("word")
  ) {
    return extractTextFromDocx(buffer);
  }
  if (ct.includes("text")) {
    return buffer.toString("utf-8");
  }
  return buffer.toString("utf-8");
}
