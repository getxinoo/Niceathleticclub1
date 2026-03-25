/**
 * qrMatrix.ts
 * Generates a visually authentic 21×21 QR-code-like matrix.
 * The three corner finder patterns, timing strips and a deterministic
 * pseudo-random data region are rendered; the result looks like a real
 * QR code without requiring an external library.
 */

/** Seeded LCG – deterministic pseudo-random from a string seed */
function seededRand(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619) >>> 0;
  }
  return () => {
    h ^= h << 13;
    h ^= h >> 7;
    h ^= h << 17;
    h = h >>> 0;
    return h / 0xffffffff;
  };
}

export function generateQRMatrix(memberId: string): boolean[][] {
  const N = 21;
  const g: boolean[][] = Array.from({ length: N }, () =>
    new Array<boolean>(N).fill(false)
  );

  // ── Finder pattern (7×7) ──────────────────────────────────────────────────
  const addFinder = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const edge = i === 0 || i === 6 || j === 0 || j === 6;
        const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        g[r + i][c + j] = edge || core;
      }
    }
  };

  addFinder(0, 0);   // top-left
  addFinder(0, 14);  // top-right
  addFinder(14, 0);  // bottom-left

  // ── Timing strips (row 6 / col 6, between finders) ───────────────────────
  for (let k = 8; k <= 12; k++) {
    g[6][k] = k % 2 === 0;
    g[k][6] = k % 2 === 0;
  }

  // ── Dark module ───────────────────────────────────────────────────────────
  g[13][8] = true;

  // ── Pseudo-random data area ───────────────────────────────────────────────
  const rand = seededRand(memberId);

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      // Reserved zones – leave unchanged
      const topLeft  = r < 9  && c < 9;   // finder + separator
      const topRight = r < 9  && c > 12;  // finder + separator
      const botLeft  = r > 12 && c < 9;   // finder + separator
      const timing   = r === 6 || c === 6;

      if (topLeft || topRight || botLeft || timing) continue;

      // ~58 % density looks close to a real QR code
      g[r][c] = rand() > 0.42;
    }
  }

  return g;
}
