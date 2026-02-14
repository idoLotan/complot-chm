import { useEffect, useMemo, useState } from "react";

import HeaderBar from "./components/HeaderBar";
import CustomersSection from "./components/CustomersSection";
import TxFormSection from "./components/TxFormSection";
import TxTableSection from "./components/TxTableSection";

import "./App.css";

import { downloadCSV, round2, todayISO } from "./lib/utils";

// API (שרת) — עובדים מול SQLite דרך endpoints קיימים (customers + tx)
import {
  listCustomers,
  createCustomer,
  deleteCustomer as apiDeleteCustomer,
  listTx,
  createTx as apiCreateTx,
  deleteTx as apiDeleteTx,
} from "./lib/api";

export default function App() {
  // =====================================================
  // 1) MAIN STATE
  // =====================================================
  const [state, setState] = useState({ customers: [], tx: [] });
  const [hydrated, setHydrated] = useState(false);

  // =====================================================
  // 2) UI STATE
  // =====================================================

  const [currentKind, setCurrentKind] = useState("topup");

  // customer form
  const [customerName, setCustomerName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  // tx form
  const [txCustomerId, setTxCustomerId] = useState("");
  const [txDate, setTxDate] = useState(todayISO());
  const [txHours, setTxHours] = useState("");
  const [txNotes, setTxNotes] = useState("");

  // filters
  const [filterCustomerId, setFilterCustomerId] = useState("__all__");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // =====================================================
  // 3) LOAD (SERVER)
  // =====================================================

  useEffect(() => {
    (async () => {
      try {
        const [customers, tx] = await Promise.all([
          listCustomers(),
          listTx(), // (אפשר להוסיף פילטרים בהמשך)
        ]);

        setState({ customers, tx });
      } catch (e) {
        console.error("initial load failed:", e);
        setState({ customers: [], tx: [] });
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // =====================================================
  // 4) DERIVED DATA (MEMO)
  // =====================================================

  const customersSorted = useMemo(() => {
    return [...state.customers].sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, [state.customers]);

  useEffect(() => {
    if (!customersSorted.length) {
      setSelectedCustomerId("");
      setTxCustomerId("");
      return;
    }

    setSelectedCustomerId((prev) => prev || String(customersSorted[0].id));
    setTxCustomerId((prev) => prev || String(customersSorted[0].id));
  }, [customersSorted]);

  const getCustomerName = (id) =>
    state.customers.find((c) => String(c.id) === String(id))?.name ?? "—";

  const balances = useMemo(() => {
    const map = new Map();

    for (const c of state.customers) {
      map.set(String(c.id), { topup: 0, usage: 0, balance: 0 });
    }

    for (const t of state.tx) {
      const cid = String(t.customer_id ?? t.customerId ?? t.customer_id); // נשמור תאימות אם יש דאטה ישן
      if (!map.has(cid)) map.set(cid, { topup: 0, usage: 0, balance: 0 });

      const item = map.get(cid);
      const kind = t.kind || "usage"; // בשרת אין kind; אם לא קיים נניח usage/תנועה
      if (kind === "topup") item.topup += Number(t.hours) || 0;
      if (kind === "usage") item.usage += Number(t.hours) || 0;
    }

    for (const [cid, v] of map.entries()) {
      v.balance = v.topup - v.usage;
      map.set(cid, v);
    }

    return map;
  }, [state.customers, state.tx]);

  const negativePreview = useMemo(() => {
    if (currentKind !== "usage") return false;

    const h = Number(txHours);
    if (!txCustomerId || !h || h <= 0) return false;

    const b = balances.get(String(txCustomerId))?.balance ?? 0;
    return b - h < 0;
  }, [currentKind, txCustomerId, txHours, balances]);

  const filteredTx = useMemo(() => {
    let tx = [...state.tx];

    if (filterCustomerId !== "__all__") {
      tx = tx.filter((t) => String(t.customer_id) === String(filterCustomerId));
    }
    if (filterFrom) tx = tx.filter((t) => String(t.date) >= filterFrom);
    if (filterTo) tx = tx.filter((t) => String(t.date) <= filterTo);

    tx.sort((a, b) => String(b.date).localeCompare(String(a.date)) || Number(b.id) - Number(a.id));

    return tx;
  }, [state.tx, filterCustomerId, filterFrom, filterTo]);

  // =====================================================
  // 5) ACTIONS (CRUD)
  // =====================================================

  async function addCustomer(e) {
    e.preventDefault();

    const name = customerName.trim();
    const contact = customerContact.trim();
    if (!name) return;

    if (state.customers.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      window.alert("לקוח עם אותו שם כבר קיים.");
      return;
    }

    try {
      const created = await createCustomer({ name, contact });

      // השרת שלך מחזיר { ok: true, id }, אז נבנה אובייקט לקוח מלא
      const newCustomer = {
        id: created?.id ?? created?.lastInsertRowid ?? created?.customerId ?? created?.customer_id,
        name,
        contact,
      };

      setState((s) => ({ ...s, customers: [...s.customers, newCustomer] }));
      setCustomerName("");
      setCustomerContact("");
    } catch (err) {
      alert("שגיאה ביצירת לקוח: " + (err?.message || err));
    }
  }

  async function deleteCustomer() {
    const cid = selectedCustomerId;
    if (!cid) return;

    const c = state.customers.find((x) => String(x.id) === String(cid));
    if (!c) return;

    const countTx = state.tx.filter((t) => String(t.customer_id) === String(cid)).length;

    const ok = window.confirm(`למחוק את הלקוח "${c.name}"?\nזה ימחק גם ${countTx} תנועות שלו.`);
    if (!ok) return;

    try {
      await apiDeleteCustomer(cid);

      setState((s) => ({
        ...s,
        customers: s.customers.filter((x) => String(x.id) !== String(cid)),
        tx: s.tx.filter((t) => String(t.customer_id) !== String(cid)),
      }));

      setSelectedCustomerId("");
    } catch (err) {
      alert("שגיאה במחיקה: " + (err?.message || err));
    }
  }

  async function addTx(e) {
    e.preventDefault();
    if (!hydrated) return;

    const h = Number(txHours);
    if (!txCustomerId || !txDate || !h || h <= 0) {
      window.alert("נא למלא לקוח / תאריך / שעות (>0).");
      return;
    }

    // השרת שלך תומך רק ב: customer_id, date, hours, note
    // אם אתה צריך kind (topup/usage) — צריך להוסיף עמודה ב-DB. כרגע נשמור אותו בתוך note כדי לא לשבור.
    const note =
      (currentKind ? `[${currentKind}] ` : "") + (txNotes.trim() || "");

    try {
      const created = await apiCreateTx({
        customer_id: Number(txCustomerId),
        date: txDate,
        hours: round2(h),
        note,
      });

      const newTx = {
        id: created?.id ?? created?.lastInsertRowid,
        customer_id: Number(txCustomerId),
        date: txDate,
        hours: round2(h),
        note,
        // לשימוש בצד לקוח:
        kind: currentKind,
        createdAt: new Date().toISOString(),
      };

      setState((s) => ({ ...s, tx: [...s.tx, newTx] }));

      setTxHours("");
      setTxNotes("");
    } catch (err) {
      alert("שגיאה ביצירת תנועה: " + (err?.message || err));
    }
  }

  async function deleteTx(id) {
    const ok = window.confirm("למחוק תנועה?");
    if (!ok) return;

    try {
      await apiDeleteTx(id);
      setState((s) => ({ ...s, tx: s.tx.filter((x) => String(x.id) !== String(id)) }));
    } catch (err) {
      alert("שגיאה במחיקה: " + (err?.message || err));
    }
  }

  function clearFilters() {
    setFilterCustomerId("__all__");
    setFilterFrom("");
    setFilterTo("");
  }

  async function resetAll() {
    const ok = window.confirm("לאפס את כל הנתונים?");
    if (!ok) return;

    // כרגע אין לך endpoint של "delete all" בשרת, אז נבצע איפוס דרך מחיקת לקוחות אחד אחד (CASCADE מוחק tx).
    try {
      for (const c of state.customers) {
        // eslint-disable-next-line no-await-in-loop
        await apiDeleteCustomer(c.id);
      }
      setState({ customers: [], tx: [] });
      setSelectedCustomerId("");
      setTxCustomerId("");
      setFilterCustomerId("__all__");
    } catch (err) {
      alert("שגיאה באיפוס: " + (err?.message || err));
    }
  }

  // =====================================================
  // 6) EXPORTS
  // =====================================================

  function exportBalances() {
    const rows = customersSorted.map((c) => {
      const b = balances.get(String(c.id)) || { balance: 0 };
      return { customer: c.name, balance_hours: round2(b.balance) };
    });

    downloadCSV("balances.csv", rows);
  }

  function exportTx() {
    downloadCSV("transactions.csv", state.tx);
  }

  // =====================================================
  // 7) RENDER
  // =====================================================

  const txHint =
    currentKind === "usage" ? "ניצול: יוריד שעות מהיתרה" : "טעינה: תוסיף שעות ליתרה";

  return (
    <div>
      <HeaderBar onExportBalances={exportBalances} onExportTx={exportTx} onReset={resetAll} />

      <main>
        <CustomersSection
          customerName={customerName}
          customerContact={customerContact}
          selectedCustomerId={selectedCustomerId}
          customersSorted={customersSorted}
          balances={balances}
          stats={{ customers: state.customers.length, tx: state.tx.length }}
          onCustomerNameChange={setCustomerName}
          onCustomerContactChange={setCustomerContact}
          onSelectedCustomerChange={setSelectedCustomerId}
          onAddCustomer={addCustomer}
          onDeleteCustomer={deleteCustomer}
        />

        <TxFormSection
          currentKind={currentKind}
          onSetKind={setCurrentKind}
          customersSorted={customersSorted}
          txCustomerId={txCustomerId}
          txDate={txDate}
          txHours={txHours}
          txNotes={txNotes}
          onTxCustomerIdChange={setTxCustomerId}
          onTxDateChange={setTxDate}
          onTxHoursChange={setTxHours}
          onTxNotesChange={setTxNotes}
          onSubmit={addTx}
          txHint={txHint}
          negativePreview={negativePreview}
        />

        <TxTableSection
          customersSorted={customersSorted}
          filteredTx={filteredTx}
          filterCustomerId={filterCustomerId}
          filterFrom={filterFrom}
          filterTo={filterTo}
          onFilterCustomerChange={setFilterCustomerId}
          onFilterFromChange={setFilterFrom}
          onFilterToChange={setFilterTo}
          onClearFilters={clearFilters}
          getCustomerName={getCustomerName}
          onDeleteTx={deleteTx}
        />
      </main>
    </div>
  );
}
