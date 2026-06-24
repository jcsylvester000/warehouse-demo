import qrcode from 'qrcode-generator';

const hash = (s) => { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h || 1; };
const digits = (seed, n) => { let out = '', x = seed >>> 0 || 1; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) >>> 0; out += x % 10; } return out; };
const ALNUM = 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789';
const alnum = (seed, n) => { let out = '', x = seed >>> 0 || 1; for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) >>> 0; out += ALNUM[x % ALNUM.length]; } return out; };

// Deterministic, realistic-looking courier label data for a Sales Order (mock, stable per SO number).
export function courierFor(so) {
  const h = hash(so.so_number);
  const method = so.delivery_method || 'Courier';
  let carrier, service, tracking, trackUrl, accent = '#4f46e5';
  if (method === 'Pickup') {
    carrier = 'Will Call'; service = 'Customer Pickup'; tracking = 'PU-' + digits(h, 8); trackUrl = ''; accent = '#64748b';
  } else if (method === 'Freight') {
    const fr = [['Old Dominion', '#d2232a'], ['XPO Logistics', '#f59e0b'], ['Estes Express', '#1d4ed8']][h % 3];
    carrier = fr[0]; accent = fr[1]; service = 'LTL Freight'; tracking = 'PRO ' + digits(h, 9);
    trackUrl = 'https://track.' + carrier.toLowerCase().replace(/[^a-z]/g, '') + '.com/?pro=' + digits(h, 9);
  } else {
    const idx = h % 3;
    if (idx === 0) { carrier = 'FedEx'; accent = '#4d148c'; service = 'FedEx Ground'; const d = digits(h, 12); tracking = d.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3'); trackUrl = 'https://www.fedex.com/fedextrack/?trknbr=' + d; }
    else if (idx === 1) { carrier = 'UPS'; accent = '#7c4a1e'; service = 'UPS Ground'; tracking = '1Z' + alnum(h, 6) + '01' + digits(h + 7, 8); trackUrl = 'https://www.ups.com/track?tracknum=' + tracking; }
    else { carrier = 'USPS'; accent = '#1d4ed8'; service = 'Priority Mail'; const d = '9400' + digits(h, 18); tracking = d.replace(/(\d{4})(?=\d)/g, '$1 '); trackUrl = 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' + d; }
  }
  const lineCount = (so.items || []).length || 1;
  const packages = Math.max(1, Math.ceil(lineCount / 2));
  const weight = (lineCount * 3.5 + (h % 40) / 10 + 2.2).toFixed(1);
  const zoneFrom = '08701';
  return { carrier, service, tracking, trackUrl, packages, weight, accent, zoneFrom, ship_date: so.expected_date || '' };
}

// Real (scannable) QR as a data URL.
export function qrDataUrl(text) {
  try { const qr = qrcode(0, 'M'); qr.addData(String(text || ' ')); qr.make(); return qr.createDataURL(4, 8); } catch (e) { return ''; }
}

// A faux Code-128-style barcode as inline bar widths (visual only).
export function barWidths(text) {
  const h = hash(text); const out = []; let x = h;
  for (let i = 0; i < 44; i++) { x = (x * 1103515245 + 12345) >>> 0; out.push(1 + (x % 3)); }
  return out;
}
