require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Create the blueprints history table if it doesn't exist
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS blueprints (
      id SERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      idea TEXT NOT NULL,
      blueprint_json JSONB NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_device_id ON blueprints(device_id);
  `);
  console.log('[DB] PostgreSQL connected and schema ready.');
}

initDb().catch(err => {
  console.error('[DB] Failed to initialize database:', err.message);
});

async function saveBlueprint(deviceId, idea, blueprintJson) {
  const result = await pool.query(
    `INSERT INTO blueprints (device_id, idea, blueprint_json) VALUES ($1, $2, $3) RETURNING id`,
    [deviceId, idea, JSON.stringify(blueprintJson)]
  );
  return result.rows[0].id;
}

async function getHistoryForDevice(deviceId) {
  const result = await pool.query(
    `SELECT id, idea, blueprint_json, created_at
     FROM blueprints
     WHERE device_id = $1
     ORDER BY created_at DESC`,
    [deviceId]
  );
  return result.rows.map(row => ({
    id: row.id,
    idea: row.idea,
    blueprint: row.blueprint_json,
    createdAt: row.created_at,
  }));
}

async function deleteBlueprint(id, deviceId) {
  const result = await pool.query(
    `DELETE FROM blueprints WHERE id = $1 AND device_id = $2`,
    [id, deviceId]
  );
  return result.rowCount > 0;
}

module.exports = { saveBlueprint, getHistoryForDevice, deleteBlueprint };