import { fmtHours } from "../lib/utils";

export default function TxTableSection({
  customersSorted,
  filteredTx,
  filterCustomerId,
  filterFrom,
  filterTo,
  onFilterCustomerChange,
  onFilterFromChange,
  onFilterToChange,
  onClearFilters,
  getCustomerName,
  onDeleteTx,
}) {
  return (
    <section className="wide">
      <h2>📋 תנועות + סינון</h2>

      <div className="row cols3">
        <div>
          <div className="muted small">סינון לקוח</div>
          <select value={filterCustomerId} onChange={(e) => onFilterCustomerChange(e.target.value)} dir="rtl">
            <option value="__all__">כל הלקוחות</option>
            {customersSorted.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="muted small">מתאריך</div>
          <input type="date" value={filterFrom} onChange={(e) => onFilterFromChange(e.target.value)} dir="rtl" />
        </div>

        <div>
          <div className="muted small">עד תאריך</div>
          <input type="date" value={filterTo} onChange={(e) => onFilterToChange(e.target.value)} dir="rtl" />
        </div>
      </div>

      <div className="right" style={{ margin: "10px 0" }}>
        <button type="button" onClick={onClearFilters}>נקה סינונים</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>תאריך</th>
              <th>לקוח</th>
              <th>סוג</th>
              <th>שעות</th>
              <th>פרויקט</th>
              <th>משימה</th>
              <th>טיקט</th>
              <th>הערות</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filteredTx.length ? (
              filteredTx.map((t) => {
                const kindLabel = t.kind === "topup" ? "טעינה" : "ניצול";
                const hoursSign = t.kind === "usage" ? "-" : "+";
                const ticketCell = t.kind === "topup" ? (t.ref || "") : (t.ticket || "");

                return (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{getCustomerName(t.customerId)}</td>
                    <td>
                      <span className={`pill ${t.kind}`}>{kindLabel}</span>
                    </td>
                    <td>
                      <strong>
                        {hoursSign}
                        {fmtHours(t.hours)}
                      </strong>
                    </td>
                    <td>{t.project || ""}</td>
                    <td>{t.task || ""}</td>
                    <td>{ticketCell}</td>
                    <td>{t.notes || ""}</td>
                    <td>
                      <button className="danger small" type="button" onClick={() => onDeleteTx(t.id)}>
                        מחק
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="muted">אין תנועות (או שהסינון ריק)</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="muted small" style={{ marginTop: 10 }}>
        טיפ: אפשר לפתוח את הכלי ב־Chrome/Edge ולשמור כקיצור דרך על שולחן העבודה.
      </p>
    </section>
  );
}
