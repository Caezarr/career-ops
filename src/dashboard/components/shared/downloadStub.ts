// Trigger a browser-side download. Generates a minimal valid PDF when the
// filename ends in .pdf so users get a real .pdf file (placeholder content),
// otherwise plain text. Used as a stand-in for real PDF rendering in the MVP.

function buildMinimalPdf(text: string): Blob {
  const safe = text.replace(/[\\()]/g, (m) => '\\' + m).slice(0, 500);
  const stream = `BT /F1 14 Tf 60 720 Td (${safe}) Tj ET`;
  const lines = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj',
    `4 0 obj << /Length ${stream.length} >>`,
    'stream',
    stream,
    'endstream endobj',
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    'trailer << /Size 6 /Root 1 0 R >>',
    '%%EOF',
  ];
  return new Blob([lines.join('\n')], { type: 'application/pdf' });
}

export function downloadStub(filename: string, content: string): void {
  try {
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    const blob = isPdf
      ? buildMinimalPdf(content)
      : new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  } catch (e) {
    console.warn('downloadStub failed:', e);
  }
}
