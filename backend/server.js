const express = require("express");
const cors = require("cors");
const pool = require("./db");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("System Monitor Backend Running");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database connection failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.post("/register", async (req, res) => {
  try {
    const { hostname, ip_address, status } = req.body;
    const current = await pool.query(
  "SELECT status FROM systems WHERE hostname = $1",
  [hostname]
);

const previousStatus =
  current.rows.length > 0 ? current.rows[0].status : null;
  if (previousStatus === null) {
  await pool.query(
    `
    INSERT INTO activity_log (hostname, status, start_time)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    `,
    [hostname, status]
  );
}

if (previousStatus !== null && previousStatus !== status) {
  await pool.query(
    `
    UPDATE activity_log
    SET
      end_time = CURRENT_TIMESTAMP,
      duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time))
    WHERE hostname = $1
      AND end_time IS NULL
    `,
    [hostname]
  );

  await pool.query(
    `
    INSERT INTO activity_log (hostname, status, start_time)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    `,
    [hostname, status]
  );
}

    await pool.query(
      `
      INSERT INTO systems (hostname, ip_address, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (hostname)
      DO UPDATE SET
        ip_address = EXCLUDED.ip_address,
        status = EXCLUDED.status,
        last_seen = CURRENT_TIMESTAMP
      `,
      [hostname, ip_address, status]
    );

    res.json({ message: "System updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register system" });
  }
});
app.get("/systems", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM systems ORDER BY last_seen DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch systems" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
app.get("/activity-log", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM activity_log
      ORDER BY start_time DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch activity log",
    });
  }
});
app.get("/settings", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT idle_timeout, heartbeat_interval FROM settings LIMIT 1"
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});
app.put("/settings", async (req, res) => {
  try {
    const { idle_timeout, heartbeat_interval } = req.body;

    await pool.query(
      `UPDATE settings
       SET idle_timeout = $1,
           heartbeat_interval = $2
       WHERE id = 1`,
      [idle_timeout, heartbeat_interval]
    );

    res.json({ message: "Settings updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});