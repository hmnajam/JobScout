import { NextResponse } from "next/server";
import { resumeToDocx } from "@/lib/export/docx";
import { resumeToPdf } from "@/lib/export/pdf";
import { getResume } from "@/lib/resume/store";

/**
 * GET /resume/export?id=<resumeId>&format=pdf|docx
 * Streams the resume as a downloadable file.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  const format = url.searchParams.get("format") ?? "pdf";

  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Missing or invalid id." }, { status: 400 });
  }

  const row = await getResume(id);
  if (!row) {
    return NextResponse.json({ error: "Resume not found." }, { status: 404 });
  }

  const base =
    (row.content.contact.name || "resume").replace(/[^a-z0-9]+/gi, "_") || "resume";

  if (format === "docx") {
    const buffer = await resumeToDocx(row.content);
    return fileResponse(
      buffer,
      `${base}.docx`,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  }

  const buffer = await resumeToPdf(row.content);
  return fileResponse(buffer, `${base}.pdf`, "application/pdf");
}

function fileResponse(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Response {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
