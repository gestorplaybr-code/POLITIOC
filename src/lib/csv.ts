export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    const blob = new Blob([""], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, filename);
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadXlsx(filename: string, rows: Record<string, unknown>[]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, filename);
}

export async function downloadPdf(
  filename: string,
  title: string,
  rows: Record<string, unknown>[],
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString("pt-BR"), 14, 20);
  if (rows.length) {
    const headers = Object.keys(rows[0]);
    autoTable(doc, {
      startY: 26,
      head: [headers],
      body: rows.map((r) => headers.map((h) => (r[h] ?? "") as string)),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
  } else {
    doc.text("Sem dados.", 14, 30);
  }
  doc.save(filename);
}

export function downloadJson(filename: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json;charset=utf-8;" });
  triggerDownload(blob, filename);
}

export async function copyTsvToClipboard(rows: Record<string, unknown>[]) {
  if (!rows.length) {
    await navigator.clipboard.writeText("");
    return;
  }
  const headers = Object.keys(rows[0]);
  const cell = (v: unknown) => (v === null || v === undefined ? "" : String(v).replace(/\t|\n/g, " "));
  const tsv = [headers.join("\t"), ...rows.map((r) => headers.map((h) => cell(r[h])).join("\t"))].join("\n");
  await navigator.clipboard.writeText(tsv);
}

export function printRows(title: string, rows: Record<string, unknown>[]) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:18px;margin:0 0 8px}
    .meta{color:#666;font-size:12px;margin-bottom:16px}
    table{border-collapse:collapse;width:100%;font-size:12px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
    thead{background:#f3f4f6}@media print{button{display:none}}</style></head><body>
    <h1>${escape(title)}</h1><div class="meta">${escape(new Date().toLocaleString("pt-BR"))} · ${rows.length} registro(s)</div>
    <table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${escape(String(r[h] ?? ""))}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <script>window.onload=()=>{window.print();}</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}