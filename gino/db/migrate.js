const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sql = fs.readFileSync(path.join(__dirname, "001_profile.sql"), "utf8");

pool.query(sql)
  .then(() => { console.log("Migration complete"); pool.end(); })
  .catch((e) => { console.error(e); process.exit(1); });
