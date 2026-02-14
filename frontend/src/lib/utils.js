export function uid() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

export function round2(x) {
  return Math.round((Number(x) + Number.EPSILON) * 100) / 100;
}

export function fmtHours(h) {
  const v = round2(h);
  return v.toLocaleString("he-IL", { maximumFractionDigits: 2 });
}

export function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function csvCell(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function downloadCSV(filename, rows) {
  if (!rows.length) {
    window.alert("אין נתונים לייצוא.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(","))];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }); // BOM for Excel Hebrew
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
