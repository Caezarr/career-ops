// Simple CSV downloader — used by Pipeline export and Applications export.
// No backend, no file I/O — just a Blob + object URL trigger.

export function downloadCSV(filename: string, rows: object[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? ""))
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
