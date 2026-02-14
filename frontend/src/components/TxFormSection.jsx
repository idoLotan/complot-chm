export default function TxFormSection({
  currentKind,
  onSetKind,
  customersSorted,
  txCustomerId,
  txDate,
  txHours,
  txRef,
  txProject,
  txTask,
  txTicket,
  txNotes,
  onTxCustomerIdChange,
  onTxDateChange,
  onTxHoursChange,
  onTxRefChange,
  onTxProjectChange,
  onTxTaskChange,
  onTxTicketChange,
  onTxNotesChange,
  onSubmit,
  txHint,
  negativePreview,
}) {
  return (
    <section>
      <h2>➕ הוספת תנועה</h2>

      <div className="segmented" role="tablist" aria-label="סוג תנועה">
        <button
          type="button"
          className={`seg ${currentKind === "topup" ? "active" : ""}`}
          onClick={() => onSetKind("topup")}
        >
          טעינת שעות
        </button>
        <button
          type="button"
          className={`seg ${currentKind === "usage" ? "active" : ""}`}
          onClick={() => onSetKind("usage")}
        >
          ניצול שעות
        </button>
      </div>

      <form onSubmit={onSubmit} className="stack">
        <div className="row cols2">
          <div>
            <div className="muted small">לקוח</div>
            <select value={txCustomerId} onChange={(e) => onTxCustomerIdChange(e.target.value)} required dir="rtl">
              {customersSorted.length ? (
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

          <div>
            <div className="muted small">תאריך</div>
            <input type="date" value={txDate} onChange={(e) => onTxDateChange(e.target.value)} required dir="rtl" />
          </div>
        </div>

        <div className="row cols2">
          <div>
            <div className="muted small">שעות</div>
            <input
              dir="rtl"
              type="number"
              required
              value={txHours}
              onChange={(e) => onTxHoursChange(e.target.value)}
            />
          </div>

          {currentKind === "topup" ? (
            <div>
              <div className="muted small">אסמכתא/חשבונית (אופציונלי)</div>
              <input
                value={txRef}
                onChange={(e) => onTxRefChange(e.target.value)}
                placeholder="REF-123 / חשבונית"
                dir="rtl"
              />
            </div>
          ) : (
            <div style={{ visibility: "hidden" }} />
          )}
        </div>

        {currentKind === "usage" && (
          <div className="row cols3">
            <input
              value={txProject}
              onChange={(e) => onTxProjectChange(e.target.value)}
              placeholder="פרויקט (אופציונלי)"
              dir="rtl"
            />
            <input
              value={txTask}
              onChange={(e) => onTxTaskChange(e.target.value)}
              placeholder="משימה (אופציונלי)"
              dir="rtl"
            />
            <input
              value={txTicket}
              onChange={(e) => onTxTicketChange(e.target.value)}
              placeholder="טיקט/מס׳ פנייה (אופציונלי)"
              dir="rtl"
            />
          </div>
        )}

        <textarea
          value={txNotes}
          onChange={(e) => onTxNotesChange(e.target.value)}
          placeholder="הערות (אופציונלי)"
          rows={3}
          dir="rtl"
        />

        <div className="right">
          <span className="muted small">{txHint}</span>
          <button className="save-btn"disabled={!customersSorted.length}>שמור תנועה</button>
        </div>

        {negativePreview && <div className="warn small">⚠️ שים לב: הפעולה תיצור יתרה שלילית ללקוח הזה.</div>}
      </form>
    </section>
  );
}
