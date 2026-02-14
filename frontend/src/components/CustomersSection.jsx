import { fmtHours } from "../lib/utils";

export default function CustomersSection({
  customerName,
  customerContact,
  selectedCustomerId,
  customersSorted,
  balances,
  stats,
  onCustomerNameChange,
  onCustomerContactChange,
  onSelectedCustomerChange,
  onAddCustomer,
  onDeleteCustomer,
}) {
  return (
    <section>
      <h2>👤 לקוחות + יתרות</h2>

      <form onSubmit={onAddCustomer} className="row cols2">
        <input
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          placeholder="שם לקוח"
          required
          dir="rtl"
        />

        <input
          value={customerContact}
          onChange={(e) => onCustomerContactChange(e.target.value)}
          placeholder="איש קשר/טלפון (אופציונלי)"
          dir="rtl"
        />

        <button className="danger" type="button" onClick={onDeleteCustomer} disabled={!selectedCustomerId}>
          מחק לקוח
        </button>
        <button type="submit">הוסף לקוח</button>
      </form>

      <div style={{ marginTop: 10 }}>
        <select value={selectedCustomerId} onChange={(e) => onSelectedCustomerChange(e.target.value)} dir="rtl">
          <option value="" disabled>
            בחר לקוח
          </option>
          {customersSorted.length > 0 ? (
            customersSorted.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          ) : (
            <option value="">(אין לקוחות)</option>
          )}
        </select>
      </div>

      <p className="muted small">
        לקוחות: {stats.customers} | תנועות: {stats.tx}
      </p>

      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table>
          <thead>
            <tr>
              <th>לקוח</th>
              <th>נטען</th>
              <th>נוצל</th>
              <th>יתרה</th>
            </tr>
          </thead>

          <tbody>
            {customersSorted.length ? (
              customersSorted.map((c) => {
                const b = balances.get(c.id) || { topup: 0, usage: 0, balance: 0 };
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{fmtHours(b.topup)}</td>
                    <td>{fmtHours(b.usage)}</td>
                    <td>
                      <strong>{fmtHours(b.balance)}</strong>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="muted">
                  אין נתונים להצגה
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
