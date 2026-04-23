import crypto from 'crypto';
import { randomBytes } from 'crypto';
import pool from './pool.js';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // excludes 0/O/1/I/l

function generateApiKey(env = 'live') {
  const chars = Array.from({ length: 6 }, () =>
    CHARSET[Math.floor(Math.random() * CHARSET.length)]
  ).join('');
  const prefix = `rsrsi_${env}_${chars}`;
  const secret = randomBytes(32).toString('base64url');
  const fullKey = `${prefix}.${secret}`;
  const secretHash = crypto.createHash('sha256').update(fullKey).digest('hex');
  return { prefix, fullKey, secretHash };
}

const RESTAURANTS = [
  {
    slug: 'le-bernardin',
    name: 'Le Bernardin',
    timezone: 'America/New_York',
    address: '155 W 51st St, New York, NY 10019',
    phone: '+12124890800',
    open_hours: [
      { day_of_week: 1, open: '12:00', close: '22:30' },
      { day_of_week: 2, open: '12:00', close: '22:30' },
      { day_of_week: 3, open: '12:00', close: '22:30' },
      { day_of_week: 4, open: '12:00', close: '22:30' },
      { day_of_week: 5, open: '12:00', close: '23:00' },
    ],
    tables: [
      { label: 'A1', capacity: 2 },
      { label: 'A2', capacity: 2 },
      { label: 'B1', capacity: 4 },
      { label: 'B2', capacity: 4 },
      { label: 'B3', capacity: 4 },
      { label: 'C1', capacity: 6 },
      { label: 'C2', capacity: 8 },
    ],
  },
  {
    slug: 'joe-pizza',
    name: "Joe's Pizza",
    timezone: 'America/New_York',
    address: '7 Carmine St, New York, NY 10014',
    phone: '+12123661182',
    open_hours: [
      { day_of_week: 0, open: '10:00', close: '23:00' },
      { day_of_week: 1, open: '10:00', close: '23:00' },
      { day_of_week: 2, open: '10:00', close: '23:00' },
      { day_of_week: 3, open: '10:00', close: '23:00' },
      { day_of_week: 4, open: '10:00', close: '23:00' },
      { day_of_week: 5, open: '10:00', close: '24:00' },
      { day_of_week: 6, open: '10:00', close: '24:00' },
    ],
    tables: [
      { label: 'T1', capacity: 2 },
      { label: 'T2', capacity: 2 },
      { label: 'T3', capacity: 4 },
      { label: 'T4', capacity: 4 },
      { label: 'T5', capacity: 4 },
      { label: 'T6', capacity: 6 },
    ],
  },
  {
    slug: 'zingerman-roadhouse',
    name: "Zingerman's Roadhouse",
    timezone: 'America/Detroit',
    address: '2501 Jackson Ave, Ann Arbor, MI 48103',
    phone: '+17347631010',
    open_hours: [
      { day_of_week: 0, open: '09:00', close: '21:00' },
      { day_of_week: 1, open: '11:00', close: '21:00' },
      { day_of_week: 2, open: '11:00', close: '21:00' },
      { day_of_week: 3, open: '11:00', close: '21:00' },
      { day_of_week: 4, open: '11:00', close: '21:00' },
      { day_of_week: 5, open: '11:00', close: '22:00' },
      { day_of_week: 6, open: '09:00', close: '22:00' },
    ],
    tables: [
      { label: 'Table 1', capacity: 2 },
      { label: 'Table 2', capacity: 2 },
      { label: 'Table 3', capacity: 4 },
      { label: 'Table 4', capacity: 4 },
      { label: 'Table 5', capacity: 4 },
      { label: 'Table 6', capacity: 4 },
      { label: 'Table 7', capacity: 6 },
      { label: 'Table 8', capacity: 8 },
    ],
  },
];

async function seed() {
  const client = await pool.connect();
  const printedKeys = {};

  try {
    // Platform key
    const { rows: existingPlatform } = await client.query(
      "SELECT id, prefix FROM api_keys WHERE role = 'platform' LIMIT 1"
    );
    let platformKey;
    if (existingPlatform.length === 0) {
      const { prefix, fullKey, secretHash } = generateApiKey('live');
      await client.query(
        `INSERT INTO api_keys (name, prefix, secret_hash, role)
         VALUES ($1, $2, $3, 'platform')`,
        ['Platform Key', prefix, secretHash]
      );
      platformKey = fullKey;
    } else {
      platformKey = `${existingPlatform[0].prefix}.<secret-not-shown>`;
    }
    printedKeys['platform'] = { label: 'PLATFORM', key: platformKey };

    for (const r of RESTAURANTS) {
      // Upsert restaurant
      const { rows: [restaurant] } = await client.query(
        `INSERT INTO restaurants (slug, name, timezone, open_hours, address, phone)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO UPDATE
           SET name = EXCLUDED.name,
               timezone = EXCLUDED.timezone,
               open_hours = EXCLUDED.open_hours,
               address = EXCLUDED.address,
               phone = EXCLUDED.phone
         RETURNING id`,
        [r.slug, r.name, r.timezone, JSON.stringify(r.open_hours), r.address, r.phone]
      );
      const restaurantId = restaurant.id;

      // Upsert tables
      for (const t of r.tables) {
        await client.query(
          `INSERT INTO dining_tables (restaurant_id, label, capacity)
           VALUES ($1, $2, $3)
           ON CONFLICT (restaurant_id, label) DO UPDATE
             SET capacity = EXCLUDED.capacity`,
          [restaurantId, t.label, t.capacity]
        );
      }

      // Keys per role
      printedKeys[r.slug] = {};
      for (const role of ['owner', 'manager', 'host', 'diner_app']) {
        const { rows: existing } = await client.query(
          `SELECT id, prefix FROM api_keys WHERE restaurant_id = $1 AND role = $2 AND revoked_at IS NULL LIMIT 1`,
          [restaurantId, role]
        );
        if (existing.length === 0) {
          const { prefix, fullKey, secretHash } = generateApiKey('live');
          await client.query(
            `INSERT INTO api_keys (restaurant_id, name, prefix, secret_hash, role)
             VALUES ($1, $2, $3, $4, $5)`,
            [restaurantId, `${r.name} ${role}`, prefix, secretHash, role]
          );
          printedKeys[r.slug][role] = fullKey;
        } else {
          printedKeys[r.slug][role] = `${existing[0].prefix}.<secret-not-shown>`;
        }
      }

      // Seed ~10 reservations for this restaurant over next 14 days
      const { rows: tables } = await client.query(
        'SELECT id, capacity FROM dining_tables WHERE restaurant_id = $1',
        [restaurantId]
      );
      const { rows: [ownerKey] } = await client.query(
        `SELECT id FROM api_keys WHERE restaurant_id = $1 AND role = 'owner' LIMIT 1`,
        [restaurantId]
      );

      const statuses = ['confirmed', 'confirmed', 'confirmed', 'pending', 'completed', 'cancelled', 'seated', 'no_show', 'confirmed', 'confirmed'];
      const diners = [
        { name: 'Alice Martin', email: 'alice@example.com', phone: '+15550001001' },
        { name: 'Bob Chen', email: 'bob@example.com', phone: '+15550001002' },
        { name: 'Carol Lee', email: 'carol@example.com', phone: '+15550001003' },
        { name: 'David Kim', email: 'david@example.com', phone: '+15550001004' },
        { name: 'Emma Davis', email: 'emma@example.com', phone: '+15550001005' },
      ];

      const now = new Date();
      for (let i = 0; i < 10; i++) {
        const dayOffset = Math.floor(i * 1.4);
        const hour = 18 + (i % 3);
        const startsAt = new Date(now);
        startsAt.setDate(startsAt.getDate() + dayOffset);
        startsAt.setHours(hour, 0, 0, 0);
        const endsAt = new Date(startsAt.getTime() + 90 * 60 * 1000);

        const table = tables[i % tables.length];
        const diner = diners[i % diners.length];
        const partySize = Math.min(table.capacity, 2 + (i % 3));
        const status = statuses[i];

        try {
          await client.query(
            `INSERT INTO reservations
               (restaurant_id, table_id, diner_name, diner_email, diner_phone,
                party_size, starts_at, ends_at, status, created_by_key_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             ON CONFLICT DO NOTHING`,
            [restaurantId, table.id, diner.name, diner.email, diner.phone,
             partySize, startsAt.toISOString(), endsAt.toISOString(), status, ownerKey?.id]
          );
        } catch (_) {
          // Skip if overlap conflict
        }
      }
    }

    // Print all keys
    console.log('\n=== SEED COMPLETE — API KEYS (save these; secrets shown only once) ===\n');
    const pKey = printedKeys['platform'];
    console.log(`${pKey.label.padEnd(40)} ${pKey.key}`);
    console.log('');
    for (const r of RESTAURANTS) {
      for (const role of ['owner', 'manager', 'host', 'diner_app']) {
        const key = printedKeys[r.slug][role];
        if (key && !key.includes('<secret-not-shown>')) {
          const label = `${r.slug} (${role}):`;
          console.log(`  ${label.padEnd(42)} ${key}`);
        }
      }
    }
    console.log('');
    console.log('Note: keys marked <secret-not-shown> already existed; re-run after revoking to regenerate.');
  } finally {
    client.release();
  }
}

seed()
  .then(() => pool.end())
  .catch(err => {
    console.error('[seed] error:', err.message);
    pool.end();
    process.exit(1);
  });
