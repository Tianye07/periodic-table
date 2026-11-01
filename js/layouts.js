// Pure layout maths. Each layout returns one { position, look } per tile.
//   position: [x, y, z]
//   look:     [x, y, z] point the tile faces, or null to keep it facing the camera.
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

export const LAYOUTS = { table, sphere, helix, grid };
