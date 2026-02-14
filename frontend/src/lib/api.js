// src/lib/api.js

export const STORAGE_KEY = "hours_bank_v1";
const API_BASE = "http://localhost:3001";

/** request helper (supports JSON + 204 No Content + error bodies) */
async function request(path, options = {}) {
  const r = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const text = await r.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!r.ok) {
    const msg =
      data && typeof data === "object" && data.error
        ? data.error
        : `HTTP ${r.status}`;
    throw new Error(msg);
  }

  return data;
}

/** validate/normalize state shape */
function normalizeState(data) {
  return {
    customers: Array.isArray(data?.customers) ? data.customers : [],
    tx: Array.isArray(data?.tx) ? data.tx : [],
  };
}

// ======================================================================
// STATE (אין /api/state בשרת שלך) => ממומש דרך endpoints קיימים
// ======================================================================

export async function loadState() {
  try {
    const [customers, tx] = await Promise.all([listCustomers(), listTx()]);
    return normalizeState({ customers, tx });
  } catch {
    return { customers: [], tx: [] };
  }
}

// אין “save all state” בשרת. שמירה נעשית דרך CRUD.
// נשאיר פונקציה לתאימות כדי שלא ישברו imports.
export async function saveState(_state) {
  return { ok: true };
}

// אין endpoint למחיקה כוללת. נשאיר לתאימות.
export async function resetStorage() {
  throw new Error("resetStorage is not supported (no /api/state endpoint).");
}

// ======================================================================
// CUSTOMERS CRUD  (תואם server.js שלך)
// ======================================================================

export async function listCustomers() {
  const data = await request("/api/customers");
  return Array.isArray(data) ? data : [];
}

export async function getCustomer(id) {
  if (id == null || id === "") throw new Error("customer id is required");
  return request(`/api/customers/${encodeURIComponent(id)}`);
}

// server returns: { ok: true, id: lastInsertRowid }
export async function createCustomer({ name, contact = "" }) {
  const res = await request("/api/customers", {
    method: "POST",
    body: JSON.stringify({ name, contact }),
  });

  // נחזיר אובייקט לקוח מלא שיהיה לך נוח מיד להכניס ל-state
  return {
    id: res?.id,
    name,
    contact,
  };
}

export async function updateCustomer(id, { name, contact }) {
  if (id == null || id === "") throw new Error("customer id is required");
  return request(`/api/customers/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ name, contact }),
  });
}

export async function deleteCustomer(id) {
  if (id == null || id === "") throw new Error("customer id is required");
  return request(`/api/customers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ======================================================================
// TX CRUD  (תואם server.js שלך)
// ======================================================================

export async function listTx(params = {}) {
  const qs = new URLSearchParams();

  // התאמה לשרת: customer_id (לא customerId)
  if (params.customerId != null && params.customerId !== "")
    qs.set("customer_id", params.customerId);

  // בשרת יש from/to בשימוש רק ב-summary, אבל נשמור את זה כאן “קדימה”
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);

  const url = qs.toString() ? `/api/tx?${qs}` : "/api/tx";
  const data = await request(url);
  return Array.isArray(data) ? data : [];
}

export async function getTx(id) {
  if (id == null || id === "") throw new Error("tx id is required");
  return request(`/api/tx/${encodeURIComponent(id)}`);
}

// server expects: { customer_id, date, hours, note }
// מחזיר: { ok: true, id }
export async function createTx(tx) {
  const payload = {
    customer_id: tx.customer_id ?? tx.customerId,
    date: tx.date,
    hours: tx.hours,
    note: tx.note ?? tx.notes ?? "",
  };

  const res = await request("/api/tx", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // נחזיר אובייקט “לקוח-צד” מלא לשימוש מיידי בטבלה
  return {
    id: res?.id,
    customer_id: Number(payload.customer_id),
    date: payload.date,
    hours: Number(payload.hours),
    note: payload.note ?? "",
    createdAt: new Date().toISOString(),
    kind: tx.kind, // אם אתה עדיין מחזיק kind בצד לקוח
  };
}

export async function updateTx(id, patch) {
  if (id == null || id === "") throw new Error("tx id is required");

  // מאפשר גם customerId וגם customer_id + note/notes
  const payload = {
    ...patch,
  };

  if (payload.customerId != null && payload.customer_id == null) {
    payload.customer_id = payload.customerId;
    delete payload.customerId;
  }
  if (payload.notes != null && payload.note == null) {
    payload.note = payload.notes;
    delete payload.notes;
  }

  return request(`/api/tx/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteTx(id) {
  if (id == null || id === "") throw new Error("tx id is required");
  return request(`/api/tx/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchFullState() {
  const [customers, tx] = await Promise.all([listCustomers(), listTx()]);
  return { customers, tx };
}
