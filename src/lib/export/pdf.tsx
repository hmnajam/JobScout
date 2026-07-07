import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ResumeContent } from "@/lib/db/schema";

/**
 * Renders a resume to a clean, ATS-safe PDF: single column, standard fonts, no
 * graphics or tables that trip up parsers.
 */

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  name: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  contact: { fontSize: 9, color: "#444", marginTop: 2, marginBottom: 10 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 4,
    borderBottom: "1 solid #ccc",
    paddingBottom: 2,
    textTransform: "uppercase",
  },
  roleHeader: { flexDirection: "row", justifyContent: "space-between" },
  roleTitle: { fontFamily: "Helvetica-Bold" },
  roleDates: { color: "#666" },
  bullet: { flexDirection: "row", marginTop: 2, paddingLeft: 8 },
  bulletDot: { width: 8 },
  bulletText: { flex: 1 },
  para: { marginBottom: 2 },
  skills: { lineHeight: 1.4 },
});

function ResumeDoc({ content }: { content: ResumeContent }) {
  const { contact } = content;
  const contactLine = [contact.email, contact.phone, contact.location]
    .filter(Boolean)
    .join("  •  ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{contact.name || "Your Name"}</Text>
        {contactLine ? <Text style={styles.contact}>{contactLine}</Text> : null}

        {content.summary ? (
          <View>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.para}>{content.summary}</Text>
          </View>
        ) : null}

        {content.experience.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {content.experience.map((exp, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 6 }}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>
                    {exp.title}
                    {exp.company ? ` — ${exp.company}` : ""}
                  </Text>
                  <Text style={styles.roleDates}>
                    {[exp.start, exp.end].filter(Boolean).join(" – ")}
                  </Text>
                </View>
                {exp.bullets.map((b, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {content.skills.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.skills}>{content.skills.join("  •  ")}</Text>
          </View>
        )}

        {content.projects.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Projects</Text>
            {content.projects.map((p, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 4 }}>
                <Text style={styles.roleTitle}>{p.name}</Text>
                {p.description ? (
                  <Text style={styles.para}>{p.description}</Text>
                ) : null}
                {(p.bullets ?? []).map((b, j) => (
                  <View key={j} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {content.education.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {content.education.map((ed, i) => (
              <View key={i} style={styles.roleHeader}>
                <Text>
                  {[ed.degree, ed.field].filter(Boolean).join(", ")}
                  {ed.school ? ` — ${ed.school}` : ""}
                </Text>
                <Text style={styles.roleDates}>{ed.end ?? ""}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

export function resumeToPdf(content: ResumeContent): Promise<Buffer> {
  return renderToBuffer(<ResumeDoc content={content} />);
}
