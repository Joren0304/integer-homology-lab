(function (root) {
  "use strict";

  const MAX_DIMENSION = 12;
  const MAX_INPUT = 10n ** 18n - 1n;
  const MAX_INTERMEDIATE = 1n << 8192n;
  const MAX_OPERATIONS = 20000;

  function integer(value, location) {
    let x;
    if (typeof value === "bigint") x = value;
    else if (Number.isSafeInteger(value)) x = BigInt(value);
    else if (typeof value === "string" && /^[+-]?\d{1,18}$/.test(value.trim())) x = BigInt(value.trim());
    else throw Error(location + "须为不超过 18 位的整数。较大的整数请以文本输入。");
    if (x > MAX_INPUT || x < -MAX_INPUT) throw Error(location + "超出 18 位整数范围。");
    return x;
  }

  function matrix(input, name, rows, cols) {
    if (!Array.isArray(input) || input.length !== rows) throw Error(name + " 应有 " + rows + " 行。");
    return Array.from(input, (row, i) => {
      if (!Array.isArray(row) || row.length !== cols) throw Error(name + " 第 " + (i + 1) + " 行应有 " + cols + " 列。");
      return Array.from(row, (x, j) => integer(x, name + " 第 " + (i + 1) + " 行第 " + (j + 1) + " 列"));
    });
  }

  function identity(n) {
    return Array.from({length:n}, (_, i) => Array.from({length:n}, (_, j) => i === j ? 1n : 0n));
  }

  function checked(value) {
    if (value >= MAX_INTERMEDIATE || value <= -MAX_INTERMEDIATE) {
      throw Error("整数消元的中间系数超出计算上限，请尝试更简单的基底或较小的矩阵。");
    }
    return value;
  }

  function addRow(M, dst, src, factor) {
    for (let j = 0; j < M[dst].length; j++) M[dst][j] = checked(M[dst][j] + factor * M[src][j]);
  }

  function addCol(M, dst, src, factor) {
    for (const row of M) row[dst] = checked(row[dst] + factor * row[src]);
  }

  function swapCols(M, i, j) {
    for (const row of M) [row[i], row[j]] = [row[j], row[i]];
  }

  function swapRows(M, i, j) {
    [M[i], M[j]] = [M[j], M[i]];
  }

  // Each column operation changes the domain basis. Apply the same operation to
  // its original-coordinate basis vectors, and its inverse to incoming columns'
  // coordinates. Row operations change the codomain basis by the inverse.
  function diagonalize(M, columns, sourceBasis, targetBasis, incoming, smith, budget) {
    function spend() {
      if (++budget.count > MAX_OPERATIONS) throw Error("整数消元步骤超出计算上限，请尝试更小的矩阵或更简单的基底。");
    }

    function exchangeRows(i, j) {
      if (i === j) return;
      spend();
      swapRows(M, i, j);
      if (targetBasis) swapCols(targetBasis, i, j);
    }

    function exchangeCols(i, j) {
      if (i === j) return;
      spend();
      swapCols(M, i, j);
      swapCols(sourceBasis, i, j);
      if (incoming) swapRows(incoming, i, j);
    }

    function combineRows(dst, src, factor) {
      if (!factor) return;
      spend();
      addRow(M, dst, src, factor);
      if (targetBasis) addCol(targetBasis, src, dst, -factor);
    }

    function combineCols(dst, src, factor) {
      if (!factor) return;
      spend();
      addCol(M, dst, src, factor);
      addCol(sourceBasis, dst, src, factor);
      if (incoming) addRow(incoming, src, dst, -factor);
    }

    let k = 0;
    for (; k < Math.min(M.length, columns); k++) {
      // A small initial pivot reduces growth of the unimodular transformations.
      let pivotRow = -1, pivotCol = -1, smallest = null;
      for (let i = k; i < M.length; i++) {
        for (let j = k; j < columns; j++) {
          const size = M[i][j] < 0n ? -M[i][j] : M[i][j];
          if (size && (smallest === null || size < smallest)) {
            smallest = size;
            pivotRow = i;
            pivotCol = j;
          }
        }
      }
      if (pivotRow === -1) break;
      exchangeRows(k, pivotRow);
      exchangeCols(k, pivotCol);

      // Euclidean division clears the pivot column and row. Whenever a remainder
      // is swapped into the pivot, the absolute pivot strictly decreases.
      for (;;) {
        let restart = false;
        for (let i = k + 1; i < M.length; i++) {
          if (!M[i][k]) continue;
          combineRows(i, k, -(M[i][k] / M[k][k]));
          if (M[i][k]) {
            exchangeRows(i, k);
            restart = true;
            break;
          }
        }
        if (restart) continue;
        for (let j = k + 1; j < columns; j++) {
          if (!M[k][j]) continue;
          combineCols(j, k, -(M[k][j] / M[k][k]));
          if (M[k][j]) {
            exchangeCols(j, k);
            restart = true;
            break;
          }
        }
        if (restart) continue;

        // For Smith form, the pivot must divide the entire remaining block.
        // Bring an offending entry onto the pivot row to continue the gcd step.
        if (smith && M[k][k] !== 1n && M[k][k] !== -1n) {
          const offender = M.findIndex((row, i) => i > k && row.some((x, j) => j > k && x % M[k][k] !== 0n));
          if (offender !== -1) {
            combineRows(k, offender, 1n);
            continue;
          }
        }
        break;
      }

      if (M[k][k] < 0n) {
        M[k] = M[k].map(x => -x);
        if (targetBasis) for (const row of targetBasis) row[k] = -row[k];
      }
    }
    return k;
  }

  function compute({m, n, p, A, B}) {
    for (const [name, dim] of Object.entries({m, n, p})) {
      if (!Number.isInteger(dim) || dim < 0 || dim > MAX_DIMENSION) throw Error(name + " 须为 0 至 12 的整数。");
    }
    const outgoing = matrix(A, "A", m, n);
    const incoming = matrix(B, "B", n, p);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < p; j++) {
        let coefficient = 0n;
        for (let k = 0; k < n; k++) coefficient += outgoing[i][k] * incoming[k][j];
        if (coefficient) {
          throw Error("不满足链复形条件：A × B 第 " + (i + 1) + " 行第 " + (j + 1) + " 列等于 " + coefficient + "，应为 0。");
        }
      }
    }

    const budget = {count:0};
    const domainBasis = identity(n);
    // An integer diagonal form suffices for A; its final n-r columns are an
    // integral basis of ker A. The incoming map has zero coordinates before r.
    const rankA = diagonalize(outgoing, n, domainBasis, null, incoming, false, budget);
    const kernelBasis = domainBasis.map(row => row.slice(rankA));
    const restricted = incoming.slice(rankA);
    const boundarySources = identity(p);
    const rankB = diagonalize(restricted, p, boundarySources, kernelBasis, null, true, budget);

    const torsion = [], free = [];
    for (let i = 0; i < n - rankA; i++) {
      const order = i < rankB ? restricted[i][i] : 0n;
      if (order === 1n) continue;
      const column = kernelBasis.map(row => row[i]);
      const sign = column.find(x => x !== 0n) < 0n ? -1n : 1n;
      const cycle = column.map(x => sign * x);
      if (order === 0n) free.push({cycle});
      else {
        // In original coordinates B * witness = order * cycle.
        const witness = boundarySources.map(row => sign * row[i]);
        torsion.push({order, cycle, witness});
      }
    }
    return {rankA, rankB, freeRank:free.length, free, torsion};
  }

  const api = {compute, MAX_DIMENSION};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.IntegerHomology = api;
})(globalThis);
