// Tiny helper that triggers a browser-side download of a single-line text file.
// Used as a stand-in for "Export PDF" in the MVP — no real PDF rendering yet.

export function downloadStub(filename: string, content: string): void {
  try {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after a tick so the click fires before the URL is freed.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (e) {
    console.warn("downloadStub failed:", e);
  }
}
