import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const resumePath = path.join(
    process.cwd(),
    "public",
    "assets",
    "George_Ma_Resume.pdf"
  );
  const resumeFile = await readFile(resumePath);

  return new Response(new Uint8Array(resumeFile), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="George_Ma_Resume.pdf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
