import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { type Profile, profile } from "@/lib/db/schema";

/** The app tracks a single user profile (row id ordering, first row wins). */
export async function getProfile(): Promise<Profile | null> {
  const rows = await db.select().from(profile).limit(1);
  return rows[0] ?? null;
}

export type ProfileInput = {
  roleTargets: string[];
  seniority?: string | null;
  locations: string[];
  remotePref: "remote" | "hybrid" | "onsite" | "any";
  salaryFloor?: number | null;
  currency: string;
  dealbreakers: string[];
};

/** Create or update the single profile row, preserving extracted skills. */
export async function saveProfile(input: ProfileInput): Promise<Profile> {
  const existing = await getProfile();
  const values = {
    roleTargets: input.roleTargets,
    seniority: input.seniority ?? null,
    locations: input.locations,
    remotePref: input.remotePref,
    salaryFloor: input.salaryFloor ?? null,
    currency: input.currency,
    dealbreakers: input.dealbreakers,
    updatedAt: new Date(),
  };
  if (existing) {
    const [updated] = await db
      .update(profile)
      .set(values)
      .where(eq(profile.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db.insert(profile).values(values).returning();
  return created;
}
