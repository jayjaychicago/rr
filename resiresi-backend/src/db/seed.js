import pool from './pool.js';

const RESTAURANTS = [
  // The two tenants the demo apps (ninopizzas.com / ginopizzas.com) point at.
  // Their slugs are deliberately short so the API reads as /restaurants/nino/...
  {
    slug: 'nino',
    name: "Nino's Pizza",
    timezone: 'America/New_York',
    address: '1123 Broadway, New York, NY 10010',
    phone: '+12125550142',
    open_hours: [
      { day_of_week: 0, open: '12:00', close: '22:00' },
      { day_of_week: 1, open: '11:00', close: '22:00' },
      { day_of_week: 2, open: '11:00', close: '22:00' },
      { day_of_week: 3, open: '11:00', close: '22:00' },
      { day_of_week: 4, open: '11:00', close: '22:00' },
      { day_of_week: 5, open: '11:00', close: '23:00' },
      { day_of_week: 6, open: '12:00', close: '23:00' },
    ],
    tables: [
      { label: 'N1', capacity: 2 },
      { label: 'N2', capacity: 2 },
      { label: 'N3', capacity: 4 },
      { label: 'N4', capacity: 4 },
      { label: 'N5', capacity: 6 },
    ],
  },
  {
    slug: 'gino',
    name: "Gino's Pizza",
    timezone: 'America/New_York',
    address: '58 Thompson St, New York, NY 10012',
    phone: '+12125550188',
    open_hours: [
      { day_of_week: 0, open: '12:00', close: '22:00' },
      { day_of_week: 1, open: '11:30', close: '22:00' },
      { day_of_week: 2, open: '11:30', close: '22:00' },
      { day_of_week: 3, open: '11:30', close: '22:00' },
      { day_of_week: 4, open: '11:30', close: '22:00' },
      { day_of_week: 5, open: '11:30', close: '23:30' },
      { day_of_week: 6, open: '12:00', close: '23:30' },
    ],
    tables: [
      { label: 'G1', capacity: 2 },
      { label: 'G2', capacity: 4 },
      { label: 'G3', capacity: 4 },
      { label: 'G4', capacity: 6 },
      { label: 'G5', capacity: 8 },
    ],
  },
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

  try {
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

      // Seed ~10 reservations for this restaurant over next 14 days
      const { rows: tables } = await client.query(
        'SELECT id, capacity FROM dining_tables WHERE restaurant_id = $1',
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
                party_size, starts_at, ends_at, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT DO NOTHING`,
            [restaurantId, table.id, diner.name, diner.email, diner.phone,
             partySize, startsAt.toISOString(), endsAt.toISOString(), status]
          );
        } catch (_) {
          // Skip if overlap conflict
        }
      }
    }

    console.log('\n=== SEED COMPLETE ===');
    console.log(`Seeded ${RESTAURANTS.length} restaurants with tables and reservations.`);
    console.log('The API is open — no key required.\n');
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
