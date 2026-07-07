import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { ResumeContent } from "@/lib/db/schema";

/**
 * Renders a resume to a clean, ATS-safe DOCX: single column, standard styling,
 * bullet lists — no text boxes or tables that break parsers.
 */

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: 22 }),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 40 },
    children: [new TextRun({ text, size: 20 })],
  });
}

export async function resumeToDocx(content: ResumeContent): Promise<Buffer> {
  const { contact } = content;
  const contactLine = [contact.email, contact.phone, contact.location]
    .filter(Boolean)
    .join("  •  ");

  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: contact.name || "Your Name", bold: true, size: 40 })],
    }),
  ];

  if (contactLine) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: contactLine, size: 18, color: "444444" })],
      }),
    );
  }

  if (content.summary) {
    children.push(sectionHeading("Summary"));
    children.push(
      new Paragraph({ children: [new TextRun({ text: content.summary, size: 20 })] }),
    );
  }

  if (content.experience.length > 0) {
    children.push(sectionHeading("Experience"));
    for (const exp of content.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 120 },
          children: [
            new TextRun({
              text: `${exp.title}${exp.company ? ` — ${exp.company}` : ""}`,
              bold: true,
              size: 20,
            }),
            new TextRun({
              text: `   ${[exp.start, exp.end].filter(Boolean).join(" – ")}`,
              size: 18,
              color: "666666",
            }),
          ],
        }),
      );
      for (const b of exp.bullets) children.push(bullet(b));
    }
  }

  if (content.skills.length > 0) {
    children.push(sectionHeading("Skills"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: content.skills.join("  •  "), size: 20 })],
      }),
    );
  }

  if (content.projects.length > 0) {
    children.push(sectionHeading("Projects"));
    for (const p of content.projects) {
      children.push(
        new Paragraph({
          spacing: { before: 100 },
          children: [new TextRun({ text: p.name, bold: true, size: 20 })],
        }),
      );
      if (p.description) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: p.description, size: 20 })] }),
        );
      }
      for (const b of p.bullets ?? []) children.push(bullet(b));
    }
  }

  if (content.education.length > 0) {
    children.push(sectionHeading("Education"));
    for (const ed of content.education) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({
              text: `${[ed.degree, ed.field].filter(Boolean).join(", ")}${ed.school ? ` — ${ed.school}` : ""}`,
              size: 20,
            }),
            new TextRun({ text: `   ${ed.end ?? ""}`, size: 18, color: "666666" }),
          ],
        }),
      );
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}
