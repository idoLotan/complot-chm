export default function HeaderBar({ onExportBalances, onExportTx, onReset }) {
  return (
    <header>
      <div>
        <h1>🕒 בנק שעות ללקוחות</h1>
      </div>
      <div className="header-actions">
        <button  className="btn-outline-purple" onClick={onExportBalances}>ייצוא יתרות CSV</button>
        <button className="btn-outline-purple" onClick={onExportTx}>ייצוא תנועות CSV</button>
        <button className="btn-outline-purple" onClick={onReset}>איפוס נתונים</button>
      </div>
    </header>
  );
}

