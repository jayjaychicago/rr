import pool from "./db";
import type { Profile } from "./api";

export async function getProfileFromDb(dinerId: string): Promise<Profile | null> {
  const { rows } = await pool.query<Profile>(
    "SELECT diner_external_id, name, phone, dietary_notes, marketing_opt_in FROM profiles WHERE diner_external_id = $1",
    [dinerId]
  );
  return rows[0] ?? null;
}

export async function upsertProfileInDb(
  data: { diner_external_id: string; name?: string; phone?: string; dietary_notes?: string; marketing_opt_in?: boolean }
): Promise<Profile> {
  const { diner_external_id, name, phone, dietary_notes, marketing_opt_in } = data;
  const { rows } = await pool.query<Profile>(
    `INSERT INTO profiles (diner_external_id, name, phone, dietary_notes, marketing_opt_in)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (diner_external_id) DO UPDATE SET
       name = COALESCE(EXCLUDED.name, profiles.name),
       phone = COALESCE(EXCLUDED.phone, profiles.phone),
       dietary_notes = COALESCE(EXCLUDED.dietary_notes, profiles.dietary_notes),
       marketing_opt_in = EXCLUDED.marketing_opt_in,
       updated_at = now()
     RETURNING diner_external_id, name, phone, dietary_notes, marketing_opt_in`,
    [diner_external_id, name ?? null, phone ?? null, dietary_notes ?? null, marketing_opt_in ?? false]
  );
  return rows[0];
}
