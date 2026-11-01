// Run with: node tests/check.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { table, sphere, helix, grid } from '../js/layouts.js';
import { parseNetWorth, tierFor, rowsToPeople, safeUrl } from '../js/sheet.js';

// minimal CSV parser (handles quoted fields)
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok  ', name); };

const values = parseCsv(readFileSync(new URL('../data/people.csv', import.meta.url), 'utf8'));
const people = rowsToPeople(values);

test('loads all 200 people', () => assert.equal(people.length, 200));
test('every person has name, https photo, country, interest', () => {
  for (const p of people) {
    assert.ok(p.name && p.country && p.interest, p.name);
    assert.ok(p.photo.startsWith('https://'), p.name);
    assert.ok(Number.isFinite(p.netWorth), p.name);
  }
});
test('net worth parsing', () => {
  assert.equal(parseNetWorth('$251,260.80'), 251260.8);
  assert.equal(parseNetWorth(' $60,393.60 '), 60393.6);
  assert.ok(Number.isNaN(parseNetWorth('')));
});
test('tier boundaries (red <100K, orange 100K-200K, green >200K)', () => {
  assert.equal(tierFor(99999.99), 'red');
  assert.equal(tierFor(100000), 'orange');
  assert.equal(tierFor(200000), 'orange');
  assert.equal(tierFor(200000.01), 'green');
});
test('first row is green, second is red', () => {
  assert.equal(people[0].tier, 'green'); // $251,260.80
  assert.equal(people[1].tier, 'red'); // $60,393.60
});
test('header with padded " Net Worth " still works', () => {
  const p = rowsToPeople([['Name', 'Photo', 'Age', 'Country', 'Interest', ' Net Worth '],
    ['A', 'https://x/y.jpg', '1', 'MY', 'Hiking', '$1.00']]);
  assert.equal(p[0].netWorth, 1);
});
test('missing column throws a clear error', () => {
  assert.throws(() => rowsToPeople([['Name'], ['A']]), /missing column/);
});
test('non-http photo URLs are dropped', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('https://a.com/x.jpg'), 'https://a.com/x.jpg');
});

const key = (p) => p.position.map((n) => Math.round(n)).join(',');
const distinct = (arr, f) => new Set(arr.map(f)).size;

test('table is 20 columns x 10 rows, no overlaps', () => {
  const t = table(200);
  assert.equal(distinct(t, (p) => Math.round(p.position[0])), 20);
  assert.equal(distinct(t, (p) => Math.round(p.position[1])), 10);
  assert.equal(distinct(t, key), 200);
});
test('grid is 5 x 4 x 10, no overlaps', () => {
  const g = grid(200);
  assert.equal(distinct(g, (p) => Math.round(p.position[0])), 5);
  assert.equal(distinct(g, (p) => Math.round(p.position[1])), 4);
  assert.equal(distinct(g, (p) => Math.round(p.position[2])), 10);
  assert.equal(distinct(g, key), 200);
});
test('sphere: all tiles on one radius, facing outward', () => {
  const s = sphere(200, 900);
  for (const { position: [x, y, z], look } of s) {
    assert.ok(Math.abs(Math.hypot(x, y, z) - 900) < 1e-6);
    assert.deepEqual(look.map((n) => n / 2), [x, y, z]);
  }
});
test('helix is a double helix: two strands half a turn apart, 100 tiles each', () => {
  const h = helix(200, 900);
  const angle = (p) => Math.atan2(p.position[0], p.position[2]);
  // tile k on strand A and tile k on strand B sit on opposite sides of the axis
  for (let k = 0; k < 100; k++) {
    const a = h[2 * k], b = h[2 * k + 1];
    assert.ok(Math.abs(a.position[0] + b.position[0]) < 1e-6);
    assert.ok(Math.abs(a.position[2] + b.position[2]) < 1e-6);
    assert.equal(a.position[1], b.position[1]);
  }
  assert.equal(distinct(h, key), 200);
  assert.ok(angle(h[0]) !== angle(h[1]));
});
test('no two tiles closer than a tile size in any 3D layout', () => {
  for (const [name, layout] of Object.entries({ sphere: sphere(200), helix: helix(200), grid: grid(200) })) {
    let min = Infinity;
    for (let i = 0; i < layout.length; i++)
      for (let j = i + 1; j < layout.length; j++) {
        const [a, b] = [layout[i].position, layout[j].position];
        min = Math.min(min, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
      }
    assert.ok(min > 100, `${name}: closest pair is ${min.toFixed(1)}px`);
  }
});

const counts = people.reduce((m, p) => ((m[p.tier] = (m[p.tier] || 0) + 1), m), {});
console.log(`\n${passed} checks passed. Tier counts:`, counts);
