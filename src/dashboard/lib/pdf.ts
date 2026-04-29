import { invoke } from '@tauri-apps/api/core';

/** Read a File as a base64 string (no data URL prefix). */
async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Build a binary string in 32k chunks to avoid call-stack overflow.
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(
      ...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)),
    );
  }
  return btoa(bin);
}

/** Heuristic role-focus picker from extracted CV text. Cheap, no AI. */
export function inferRoleFocus(text: string): string {
  const t = text.toLowerCase();
  const score = (kws: string[]) =>
    kws.reduce((s, k) => s + (t.match(new RegExp(`\\b${k}\\b`, 'g'))?.length ?? 0), 0);
  const finance = score([
    'lbo', 'fp&a', 'forecast', 'ebitda', 'irr', 'valuation', 'dcf',
    'm&a', 'transaction', 'investment banking', 'private equity', 'hedge',
  ]);
  const product = score([
    'product manager', 'roadmap', 'user research', 'feature', 'shipping',
    'a/b test', 'activation', 'churn', 'pmf', 'discovery', 'okr',
  ]);
  const consulting = score([
    'consultant', 'mckinsey', 'bain', 'bcg', 'monitor deloitte',
    'roland berger', 'strategy', 'due diligence', 'consulting',
  ]);
  const tech = score([
    'engineer', 'developer', 'kubernetes', 'react', 'typescript',
    'python', 'node', 'aws', 'gcp', 'machine learning', 'llm',
  ]);
  const top = Math.max(finance, product, consulting, tech);
  if (top === 0) return 'General';
  if (top === finance) return 'Finance / FP&A';
  if (top === product) return 'Product Management';
  if (top === consulting) return 'Consulting';
  return 'Tech';
}

export interface IngestedCv {
  parsedText: string;
  baseName: string;
  roleFocus: string;
}

/** Read a PDF File via the Tauri parse_cv_pdf command and infer a role focus.
 *  Throws if the PDF can't be parsed (caller should catch + toast). */
export async function ingestPdfFile(file: File): Promise<IngestedCv> {
  const baseName = file.name.replace(/\.pdf$/i, '').slice(0, 60) || 'Imported CV';
  const b64 = await fileToBase64(file);
  const parsedText = await invoke<string>('parse_cv_pdf', { b64 });
  const roleFocus = inferRoleFocus(parsedText);
  return { parsedText, baseName, roleFocus };
}
