// Pure layout maths. Each layout returns one { position, look } per tile.
//   position: [x, y, z]
//   look:     [x, y, z] point the tile faces, or null to keep it facing the camera.
//   up:       optional [x, y, z] direction for the tile's top edge (default world up).
// No three.js import, so this can be tested in Node.

export const TABLE_COLS = 20;
export const TABLE_ROWS = 10;
export const GRID_COLS = 5; // x (5 across)
export const GRID_ROWS = 4; // y (4 down)
export const GRID_LAYERS = 10; // z (10 deep)

/** 20 x 10 table. Tile size is 120 x 160. */
export function table(count) {
  const stepX = 140;
  const stepY = 180;
  return Array.from({ length: count }, (_, i) => {
    const col = i % TABLE_COLS;
    const row = Math.floor(i / TABLE_COLS) % TABLE_ROWS;
    return {
      position: [(col - (TABLE_COLS - 1) / 2) * stepX, ((TABLE_ROWS - 1) / 2 - row) * stepY, 0],
      look: null,
    };
  });
}

/** Evenly spread points on a sphere, tiles facing outward. */
export function sphere(count, radius = 900) {
  return Array.from({ length: count }, (_, i) => {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    const x = radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(phi);
    return { position: [x, y, z], look: [x * 2, y * 2, z * 2] };
  });
}

/**
 * Double helix: even indexes ride strand A, odd indexes strand B,
 * and strand B is rotated half a turn (PI) from strand A.
 */
export function helix(count, radius = 750) {
  const perStrand = Math.ceil(count / 2);
  const turnStep = 0.22; // radians between neighbours on one strand (~3.5 turns total)
  const rise = 28; // vertical drop per tile (leaves clear vertical space between coils)
  return Array.from({ length: count }, (_, i) => {
    const strand = i % 2;
    const k = Math.floor(i / 2);
    const theta = k * turnStep + strand * Math.PI;
    const x = radius * Math.sin(theta);
    const z = radius * Math.cos(theta);
    const y = -(k - (perStrand - 1) / 2) * rise;
    return { position: [x, y, z], look: [x * 2, y, z * 2] };
  });
}

/** 5 across (x) by 4 down (y) by 10 deep (z) = 200 tiles. */
export function grid(count) {
  const stepX = 220;
  const stepY = 260;
  const stepZ = 450;
  const perLayer = GRID_COLS * GRID_ROWS;
  return Array.from({ length: count }, (_, i) => {
    const col = i % GRID_COLS;
    const row = Math.floor(i / GRID_COLS) % GRID_ROWS;
    const layer = Math.floor(i / perLayer) % GRID_LAYERS;
    return {
      position: [
        (col - (GRID_COLS - 1) / 2) * stepX,
        ((GRID_ROWS - 1) / 2 - row) * stepY,
        (layer - (GRID_LAYERS - 1) / 2) * stepZ,
      ],
      look: null,
    };
  });
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => scale(a, 1 / Math.hypot(...a));
const centroid = (...pts) => scale(pts.reduce(add), 1 / pts.length);

/**
 * Tiles per row on one face: a full triangle (1, 2, 3, ... rows) with any
 * shortfall taken one tile at a time from the bottom rows upward, so no row
 * is left half empty. E.g. 10 rows, 50 tiles -> 1,2,3,4,5,5,6,7,8,9.
 * (Only a short final face, when count isn't a multiple of 4, ever drops a
 * row below 2 tiles; rows emptied that way are removed from the bottom.)
 */
function rowCounts(rows, tiles) {
  const counts = Array.from({ length: rows }, (_, r) => r + 1);
  let excess = counts.reduce((s, n) => s + n, 0) - Math.max(0, tiles);
  for (const floor of [2, 1, 0]) {
    let progress = true;
    while (excess > 0 && progress) {
      progress = false;
      for (let r = rows - 1; r >= 0 && excess > 0; r--) {
        if (counts[r] > Math.min(floor, r + 1)) { counts[r]--; excess--; progress = true; }
      }
    }
  }
  return counts;
}

/**
 * 4-face pyramid (regular tetrahedron), apex up, one face toward the camera.
 * Tiles are split evenly across the 4 faces. On each face they sit in rows
 * of roughly 1, 2, 3, ... tiles from the top corner down, each row stretched
 * edge to edge so the corners are filled. Tiles face outward, with their "up"
 * pointing at the face's top corner so rows read straight across.
 */
export function pyramid(count) {
  const spacing = 210; // centre-to-centre along a row (row pitch is spacing * sqrt(3)/2 ~ 182)
  const inset = 120; // distance from a lattice edge to the solid's edge
  const perFace = Math.ceil(count / 4);
  let rows = 1;
  while ((rows * (rows + 1)) / 2 < perFace) rows++;

  // Size the solid so the lattice fits inside each face with `inset` margin.
  const innerInradius = ((rows - 1) * spacing) / (2 * Math.sqrt(3));
  const outerInradius = innerInradius + inset;
  const edge = 2 * Math.sqrt(3) * outerInradius;
  const R = (edge * Math.sqrt(6)) / 4; // circumradius
  const baseRadius = edge / Math.sqrt(3);
  const baseY = -R / 3;
  const shiftY = -R / 3; // centre the solid's bounding box on the origin
  const baseAt = (deg) => {
    const t = (deg * Math.PI) / 180;
    return [baseRadius * Math.sin(t), baseY, baseRadius * Math.cos(t)];
  };
  const apex = [0, R, 0];
  const back = baseAt(180);
  const frontRight = baseAt(60);
  const frontLeft = baseAt(300);

  // [top corner, other two corners]; order sets which face fills first.
  const faces = [
    [apex, frontLeft, frontRight], // front
    [apex, frontRight, back], // right
    [apex, back, frontLeft], // left
    [back, frontLeft, frontRight], // bottom
  ];
  const k = rows > 1 ? innerInradius / outerInradius : 0;

  const out = [];
  faces.forEach(([top, a, b], f) => {
    const g = centroid(top, a, b);
    const normal = unit(g); // solid is centred on the origin before shiftY
    const up = unit(sub(top, g));
    // order the two lower corners left-to-right as seen from outside
    const right = cross(up, normal);
    const [left, rightCorner] = dot(sub(b, a), right) >= 0 ? [a, b] : [b, a];
    const T = add(g, scale(sub(top, g), k));
    const L = add(g, scale(sub(left, g), k));
    const Rc = add(g, scale(sub(rightCorner, g), k));

    const start = f * perFace;
    const onFace = Math.max(0, Math.min(perFace, count - start));
    for (const [r, inRow] of rowCounts(rows, onFace).entries()) {
      for (let i = 0; i < inRow; i++) {
        // Every row spans its full width, so the face's corners are always filled.
        const along = inRow > 1 ? i / (inRow - 1) : 0.5;
        const p = rows > 1
          ? add(T, scale(add(sub(L, T), scale(sub(Rc, L), along)), r / (rows - 1)))
          : g;
        const position = [p[0], p[1] + shiftY, p[2]];
        out.push({ position, look: add(position, scale(normal, 1000)), up });
      }
    }
  });
  return out;
}

export const LAYOUTS = { table, sphere, helix, grid, pyramid };
