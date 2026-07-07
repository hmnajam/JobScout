import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

/**
 * Extract plain text from an uploaded resume file. Supports PDF, DOCX, and plain
 * text/markdown. The extracted text is later fed to the LLM for structured
 * extraction — see `extractResume`.
 */
export async function parseResumeFile(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  switch (ext) {
    case "pdf": {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      return result.text.trim();
    }
    case "docx": {
      const { value } = await mammoth.extractRawText({ buffer });
      return value.trim();
    }
    case "txt":
    case "md":
      return buffer.toString("utf8").trim();
    default:
      throw new Error(
        `Unsupported resume format ".${ext}". Upload a PDF, DOCX, TXT, or MD file.`,
      );
  }
}
