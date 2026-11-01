// Google Sheets access and row parsing. No DOM or three.js here, so it can be tested in Node.

export const TIERS = {
  red: { label: 'Under $100K', color: '#EF3022' },
  orange: { label: '$100K to $200K', color: '#FDCA35' },
  green: { label: 'Over $200K', color: '#3A9F48' },
};

/** "$251,260.80" -> 251260.8. Returns NaN when nothing numeric is found. */
export function parseNetWorth(value) {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace(/[^0-9.\-]/g, '');
  return cleaned === '' ? NaN : Number(cleaned);
}

/** Red < 100K, Orange 100K..200K, Green > 200K. Unparseable values fall back to red. */
export function tierFor(netWorth) {
  if (!Number.isFinite(netWorth)) return 'red';
  if (netWorth > 200000) return 'green';
  if (netWorth >= 100000) return 'orange';
  return 'red';
}

const clean = (v) => String(v ?? '').replace(/[^\x20-\x7E¡-￿]/g, '').trim();

/** Only http(s) image URLs are used; anything else is dropped. */
export function safeUrl(value) {
  try {
    const u = new URL(clean(value));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
}

/** Turn the Sheets `values` array (first row = headers) into person objects. */
export function rowsToPeople(values) {
  if (!Array.isArray(values) || values.length < 2) return [];
  const headers = values[0].map((h) => clean(h).toLowerCase());
  const col = (name) => headers.indexOf(name);
  const idx = {
    name: col('name'),
    photo: col('photo'),
    age: col('age'),
    country: col('country'),
    interest: col('interest'),
    netWorth: col('net worth'),
  };
  const missing = Object.entries(idx).filter(([, i]) => i < 0).map(([k]) => k);
  if (missing.length) throw new Error(`Sheet is missing column(s): ${missing.join(', ')}`);

  return values
    .slice(1)
    .filter((row) => row.some((c) => clean(c) !== ''))
    .map((row) => {
      const netWorth = parseNetWorth(row[idx.netWorth]);
      return {
        name: clean(row[idx.name]),
        photo: safeUrl(row[idx.photo]),
        age: clean(row[idx.age]),
        country: clean(row[idx.country]),
        interest: clean(row[idx.interest]),
        netWorth,
        netWorthLabel: clean(row[idx.netWorth]),
        tier: tierFor(netWorth),
      };
    });
}

async function googleGet(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message ?? '';
    } catch { /* body was not JSON */ }
    const err = new Error(detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function fetchPeople({ sheetId, range }, token) {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}` +
    `/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;
  const data = await googleGet(url, token);
  return rowsToPeople(data.values);
}

export async function fetchProfile(token) {
  return googleGet('https://www.googleapis.com/oauth2/v3/userinfo', token);
}
