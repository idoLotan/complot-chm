// server.js
import express from "express";
import cors from "cors";
import Database from "better-sqlite3";

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database("./app.db");

// חשוב: להפעיל Foreign Keys ב-SQLite
db.pragma("foreign_keys = ON");

// סכימה
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT
  );

  CREATE TABLE IF NOT EXISTS tx (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    date TEXT NOT NULL,          -- ISO: "2026-02-11" או "2026-02-11T10:30"
    hours REAL NOT NULL,         -- למשל 1.5
    note TEXT,                   -- תיאור חופשי
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_tx_customer ON tx(customer_id);
  CREATE INDEX IF NOT EXISTS idx_tx_date ON tx(date);
`);

// ---------- helpers ----------
function badRequest(res, msg) {
  return res.status(400).json({ ok: false, error: msg });
}
function notFound(res, msg = "Not found") {
  return res.status(404).json({ ok: false, error: msg });
}

// ---------- health ----------
app.get("/api/health", (req, res) => {
  try {
    const row = db.prepare("SELECT 1 AS ok").get();
    res.json({ ok: true, db: row.ok });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ======================================================================
// CUSTOMERS
// ======================================================================

// GET all customers
app.get("/api/customers", (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, name, contact
      FROM customers
      ORDER BY name
    `).all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET one customer (with tx count)
app.get("/api/customers/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return badRequest(res, "Invalid customer id");

    const row = db.prepare(`
      SELECT c.id, c.name, c.contact,
             (SELECT COUNT(*) FROM tx t WHERE t.customer_id = c.id) AS tx_count
      FROM customers c
      WHERE c.id = ?
    `).get(id);

    if (!row) return notFound(res, "Customer not found");
    res.json(row);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST create customer
app.post("/api/customers", (req, res) => {
  try {
    const { name, contact } = req.body || {};
    if (!name || typeof name !== "string") return badRequest(res, "name is required");

    const info = db.prepare(
      "INSERT INTO customers (name, contact) VALUES (?, ?)"
    ).run(name.trim(), contact ?? null);

    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// PUT update customer
app.put("/api/customers/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return badRequest(res, "Invalid customer id");

    const { name, contact } = req.body || {};
    if (name != null && typeof name !== "string") return badRequest(res, "name must be string");
    if (contact != null && typeof contact !== "string") return badRequest(res, "contact must be string");

    const existing = db.prepare("SELECT id FROM customers WHERE id=?").get(id);
    if (!existing) return notFound(res, "Customer not found");

    db.prepare(`
      UPDATE customers
      SET name = COALESCE(?, name),
          contact = COALESCE(?, contact)
      WHERE id = ?
    `).run(name?.trim() ?? null, contact ?? null, id);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// DELETE customer (CASCADE deletes tx)
app.delete("/api/customers/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return badRequest(res, "Invalid customer id");

    const info = db.prepare("DELETE FROM customers WHERE id=?").run(id);
    if (info.changes === 0) return notFound(res, "Customer not found");

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ======================================================================
// TX (hours / transactions)
// ======================================================================

// GET all tx (optional filter by customer_id)
app.get("/api/tx", (req, res) => {
  try {
    const customerId = req.query.customer_id ? Number(req.query.customer_id) : null;
    if (req.query.customer_id && !Number.isFinite(customerId)) {
      return badRequest(res, "Invalid customer_id");
    }

    const rows = customerId
      ? db.prepare(`
          SELECT t.id, t.customer_id, c.name AS customer_name, t.date, t.hours, t.note, t.created_at
          FROM tx t
          JOIN customers c ON c.id = t.customer_id
          WHERE t.customer_id = ?
          ORDER BY t.date DESC, t.id DESC
        `).all(customerId)
      : db.prepare(`
          SELECT t.id, t.customer_id, c.name AS customer_name, t.date, t.hours, t.note, t.created_at
          FROM tx t
          JOIN customers c ON c.id = t.customer_id
          ORDER BY t.date DESC, t.id DESC
        `).all();

    res.json(rows);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// GET one tx
app.get("/api/tx/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return badRequest(res, "Invalid tx id");

    const row = db.prepare(`
      SELECT t.id, t.customer_id, c.name AS customer_name, t.date, t.hours, t.note, t.created_at
      FROM tx t
      JOIN customers c ON c.id = t.customer_id
      WHERE t.id = ?
    `).get(id);

    if (!row) return notFound(res, "Tx not found");
    res.json(row);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// POST create tx
app.post("/api/tx", (req, res) => {
  try {
    const { customer_id, date, hours, note } = req.body || {};

    const cid = Number(customer_id);
    if (!Number.isFinite(cid)) return badRequest(res, "customer_id is required (number)");
    if (!date || typeof date !== "string") return badRequest(res, "date is required (string)");
    const h = Number(hours);
    if (!Number.isFinite(h)) return badRequest(res, "hours is required (number)");

    // לוודא שהלקוח קיים
    const c = db.prepare("SELECT id FROM customers WHERE id=?").get(cid);
    if (!c) return badRequest(res, "customer_id does not exist");

    const info = db.prepare(`
      INSERT INTO tx (customer_id, date, hours, note)
      VALUES (?, ?, ?, ?)
    `).run(cid, date.trim(), h, note ?? null);

    res.json({ ok: true, id: info.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// PUT update tx
app.put("/api/tx/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return badRequest(res, "Invalid tx id");

    const existing = db.prepare("SELECT id FROM tx WHERE id=?").get(id);
    if (!existing) return notFound(res, "Tx not found");

    const { customer_id, date, hours, note } = req.body || {};

    let cid = null;
    if (customer_id != null) {
      cid = Number(customer_id);
      if (!Number.isFinite(cid)) return badRequest(res, "customer_id must be number");
      const c = db.prepare("SELECT id FROM customers WHERE id=?").get(cid);
      if (!c) return badRequest(res, "customer_id does not exist");
    }

    let h = null;
    if (hours != null) {
      h = Number(hours);
      if (!Number.isFinite(h)) return badRequest(res, "hours must be number");
    }

    if (date != null && typeof date !== "string") return badRequest(res, "date must be string");
    if (note != null && typeof note !== "string") return badRequest(res, "note must be string");

    db.prepare(`
      UPDATE tx
      SET customer_id = COALESCE(?, customer_id),
          date        = COALESCE(?, date),
          hours       = COALESCE(?, hours),
          note        = COALESCE(?, note)
      WHERE id = ?
    `).run(cid, date?.trim() ?? null, h, note ?? null, id);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// DELETE tx
app.delete("/api/tx/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return badRequest(res, "Invalid tx id");

    const info = db.prepare("DELETE FROM tx WHERE id=?").run(id);
    if (info.changes === 0) return notFound(res, "Tx not found");

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ======================================================================
// SUMMARY (nice for dashboard)
// ======================================================================

// סיכום שעות ללקוח (אופציונלי לפי טווח תאריכים)
app.get("/api/summary/customers", (req, res) => {
  try {
    const { from, to } = req.query; // strings or undefined

    const rows = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.contact,
        COALESCE(SUM(t.hours), 0) AS total_hours,
        COUNT(t.id) AS tx_count
      FROM customers c
      LEFT JOIN tx t
        ON t.customer_id = c.id
        AND (? IS NULL OR t.date >= ?)
        AND (? IS NULL OR t.date <= ?)
      GROUP BY c.id
      ORDER BY c.name
    `).all(from ?? null, from ?? null, to ?? null, to ?? null);

    res.json(rows);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(3001, () => console.log("API on http://localhost:3001"));
