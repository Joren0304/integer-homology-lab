const test = require("node:test");
const assert = require("node:assert/strict");
const { compute } = require("../dist/homology.js");

const bigMatrix = (matrix) => matrix.map((row) => row.map(BigInt));
const abs = (x) => (x < 0n ? -x : x);

function gcd(a, b) {
  while (b !== 0n) [a, b] = [b, a % b];
  return abs(a);
}

function determinant(square) {
  if (square.length === 0) return 1n;
  if (square.length === 1) return square[0][0];
  return square[0].reduce((sum, value, j) => {
    if (value === 0n) return sum;
    const minor = square.slice(1).map((row) => row.filter((_, k) => k !== j));
    return sum + (j % 2 === 0 ? value : -value) * determinant(minor);
  }, 0n);
}

function* subsets(n, k, start = 0, acc = []) {
  if (k === 0) {
    yield acc;
    return;
  }
  for (let i = start; i <= n - k; i++) yield* subsets(n, k - 1, i + 1, [...acc, i]);
}

// Independent oracle for small inputs: Δ_k is the gcd of all k×k minors.
function determinantalDivisor(matrix, columns, k) {
  if (k === 0) return 1n;
  let d = 0n;
  for (const rows of subsets(matrix.length, k)) {
    for (const cols of subsets(columns, k)) {
      const minor = rows.map((i) => cols.map((j) => matrix[i][j]));
      d = gcd(d, determinant(minor));
      if (d === 1n) return d;
    }
  }
  return d;
}

function invariants(matrix, columns) {
  const factors = [];
  let previous = 1n;
  for (let k = 1; k <= Math.min(matrix.length, columns); k++) {
    const divisor = determinantalDivisor(matrix, columns, k);
    if (divisor === 0n) break;
    factors.push(divisor / previous);
    previous = divisor;
  }
  return { rank: factors.length, torsion: factors.filter((d) => d !== 1n), divisor: previous };
}

function product(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, j) => sum + value * vector[j], 0n));
}

function assertVector(vector, length) {
  assert.ok(Array.isArray(vector));
  assert.equal(vector.length, length);
  for (const coordinate of vector) assert.equal(typeof coordinate, "bigint");
}

function verify(chain, expected) {
  const { m, n, p } = chain;
  const A = bigMatrix(chain.A);
  const B = bigMatrix(chain.B);
  const result = compute(chain);
  const a = invariants(A, n);
  const b = invariants(B, p);
  assert.equal(result.rankA, a.rank);
  assert.equal(result.rankB, b.rank);
  assert.equal(result.freeRank, n - a.rank - b.rank);
  assert.equal(result.free.length, result.freeRank);
  assert.deepEqual(result.torsion.map((entry) => entry.order), b.torsion);
  if (expected) {
    assert.equal(result.freeRank, expected.free);
    assert.deepEqual(b.torsion, expected.torsion);
  }

  const generators = [...result.free, ...result.torsion];
  for (const { cycle } of generators) {
    assertVector(cycle, n);
    assert.deepEqual(product(A, cycle), Array(m).fill(0n));
  }
  for (const { order, cycle, witness } of result.torsion) {
    assertVector(witness, p);
    assert.deepEqual(product(B, witness), cycle.map((value) => order * value));

    // The index [im(B) + Z*cycle : im(B)] is the exact order of the class.
    const enlarged = B.map((row, i) => [...row, cycle[i]]);
    const after = determinantalDivisor(enlarged, p + 1, b.rank);
    assert.equal(b.divisor / after, order);
  }

  // ker(A) is saturated. Thus a sublattice in ker(A) of the same rank with
  // gcd of maximal minors 1 is all of ker(A), not a proper finite-index copy.
  const span = B.map((row, i) => [...row, ...generators.map(({ cycle }) => cycle[i])]);
  assert.equal(determinantalDivisor(span, p + generators.length, n - a.rank), 1n);
  return result;
}

test("real projective plane has one order-two class", () => {
  verify({ m: 1, n: 1, p: 1, A: [[0]], B: [[2]] }, { free: 0, torsion: [2n] });
});

test("torus and Klein bottle have different integral first homology", () => {
  const dimensions = { m: 1, n: 2, p: 1, A: [[0, 0]] };
  verify({ ...dimensions, B: [[0], [0]] }, { free: 2, torsion: [] });
  verify({ ...dimensions, B: [[0], [-2]] }, { free: 1, torsion: [2n] });
});

test("empty source, target, middle group, and zero kernel", () => {
  verify({ m: 0, n: 0, p: 0, A: [], B: [] }, { free: 0, torsion: [] });
  verify({ m: 2, n: 0, p: 3, A: [[], []], B: [] }, { free: 0, torsion: [] });
  verify({ m: 0, n: 3, p: 0, A: [], B: [[], [], []] }, { free: 3, torsion: [] });
  verify({ m: 1, n: 2, p: 0, A: [[2, 4]], B: [[], []] }, { free: 1, torsion: [] });
  verify({ m: 2, n: 2, p: 1, A: [[2, 1], [5, 3]], B: [[0], [0]] }, { free: 0, torsion: [] });
});

test("nondividing diagonal entries are put into canonical invariant factors", () => {
  verify({ m: 0, n: 3, p: 3, A: [], B: [[6, 0, 0], [0, -10, 0], [0, 0, 15]] },
    { free: 0, torsion: [30n, 30n] });
  verify({ m: 0, n: 3, p: 2, A: [], B: [[4, 0], [0, 6], [0, 0]] },
    { free: 1, torsion: [2n, 12n] });
});

test("dependent rows of A and noncoordinate kernel with mixed free/torsion", () => {
  // u=(2,-1,0,0) and v=(0,3,-2,0) span a sublattice of index 2 in
  // their saturation. B has columns 4u, 6v, 4u+6v.
  verify({
    m: 2, n: 4, p: 3,
    A: [[1, 2, 3, 0], [-3, -6, -9, 0]],
    B: [[8, 0, 8], [-4, 18, 14], [0, -12, -12], [0, 0, 0]]
  }, { free: 1, torsion: [2n, 24n] });
});

test("chain-preserving changes of integral bases preserve class orders and witnesses", () => {
  // Each elementary row operation on B is paired with its inverse column
  // operation on A. Changes in B's domain also exercise witness coordinates.
  let seed = 17;
  const pick = (n) => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed % n;
  };
  for (let sample = 0; sample < 16; sample++) {
    const A = [[1, 0, 0, 0], [2, 0, 0, 0]];
    const B = [[0, 0, 0], [4, 0, 4], [0, 6, -6], [0, 0, 0]];
    for (let step = 0; step < 8; step++) {
      const i = pick(4), j = (i + 1 + pick(3)) % 4;
      const k = [1, -1, 2, -2][pick(4)];
      B[i] = B[i].map((v, c) => v + k * B[j][c]);
      for (const row of A) row[j] -= k * row[i];
      const u = pick(3), v = (u + 1 + pick(2)) % 3;
      for (const row of B) row[u] += row[v];
    }
    verify({ m: 2, n: 4, p: 3, A, B }, { free: 1, torsion: [2n, 12n] });
  }
});

test("torsion order larger than Number.MAX_SAFE_INTEGER is exact", () => {
  const N = 9007199254740993n;
  verify({ m: 1, n: 3, p: 2, A: [[1, -1, 0]], B: [[N, 0], [N, 0], [0, N-1n]] },
    { free: 0, torsion: [N * (N-1n)] });
});

test("rejects consecutive boundaries whose composition is nonzero", () => {
  assert.throws(() => compute({ m: 1, n: 2, p: 1, A: [[1, 1]], B: [[2], [-1]] }));
});

test("rejects invalid shape, unsafe numeric inputs and coefficients beyond the input bound", () => {
  const problem = {m:1,n:1,p:0,A:[[0]],B:[[]]};
  for (const patch of [{n:13},{m:-1},{A:[]},{A:[[]]},{B:[[0]]},
    {A:[[1.5]]},{A:[[Number.MAX_SAFE_INTEGER+1]]},{A:[["1000000000000000000"]]}]) {
    assert.throws(() => compute({...problem,...patch}));
  }
});
