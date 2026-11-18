(function (root) {
  "use strict";

  function parse(text, rows, cols, label = "矩阵") {
    if (!Number.isSafeInteger(rows) || !Number.isSafeInteger(cols) || rows < 0 || cols < 0) {
      throw new Error(label + "的行数和列数须为非负整数。");
    }
    if (typeof text !== "string") throw new Error(label + "须为文本。");
    const content = text.replace(/\r\n?/g, "\n").trim();
    if (rows === 0 || cols === 0) {
      if (content) throw new Error(label + "的行数或列数为零，请清空输入框。");
      return Array.from({length: rows}, () => []);
    }
    if (!content) throw new Error(label + "尚未填写，需要 " + rows + " 行 " + cols + " 列。");
    // A semicolon followed by a line break is a single row separator.
    const lines = content.split(/[;；][^\S\n]*\n?|\n/u);
    if (lines.length !== rows) throw new Error(label + "需要 " + rows + " 行，实际有 " + lines.length + " 行。");
    return lines.map((line, index) => {
      const where = label + "第 " + (index + 1) + " 行";
      if (!line.trim()) throw new Error(where + "为空。");
      const entries = [];
      for (const group of line.split(/[,，]/u)) {
        if (!group.trim()) throw new Error(where + "的逗号旁有空单元格。");
        for (const entry of group.trim().split(/\s+/u)) entries.push(entry);
      }
      if (entries.length !== cols) throw new Error(where + "需要 " + cols + " 列，实际有 " + entries.length + " 列。");
      return entries.map((entry, column) => {
        if (!/^[+-]?\d+$/u.test(entry)) {
          throw new Error(where + "第 " + (column + 1) + " 列须为整数。");
        }
        const digits = entry.replace(/^[+-]?0*/u, "") || "0";
        return entry.startsWith("-") && digits !== "0" ? "-" + digits : digits;
      });
    });
  }

  // Z^p --B--> Z^n --A--> Z^m, with coordinate vectors as columns.
  const examples = {
    klein: {
      name: "克莱因瓶", description: "单顶点胞腔分解有两条边 a、b。二维胞腔沿 a b a⁻¹ b 粘合，边界是 2b。第一同调群为 ℤ ⊕ ℤ/2。",
      k: 1, m: 1, n: 2, p: 1, A: [[0, 0]], B: [[0], [2]]
    },
    rp2: {
      name: "实射影平面", description: "零、一、二维各取一个胞腔。二维胞腔的边界沿唯一的边绕两次，第一同调群为 ℤ/2。",
      k: 1, m: 1, n: 1, p: 1, A: [[0]], B: [[2]]
    },
    torus: {
      name: "二维环面", description: "沿 a b a⁻¹ b⁻¹ 粘合正方形。两条定向边在胞腔边界中各自相消，第一同调群为 ℤ²。",
      k: 1, m: 1, n: 2, p: 1, A: [[0, 0]], B: [[0], [0]]
    },
    triangle: {
      name: "实心三角形", description: "依次取定向边 0→1、1→2、2→0；它们的和是三角形面的边界，并生成全部一维闭链。第一同调群为零。",
      k: 1, m: 3, n: 3, p: 1, A: [[-1, 0, 1], [1, -1, 0], [0, 1, -1]], B: [[1], [1], [1]]
    },
    mixed: {
      name: "自由项与挠项", description: "在四个生成元上取 A(x) = x₁ − x₂。B 的两列给出独立的边界关系，商群为 ℤ ⊕ ℤ/2 ⊕ ℤ/6。",
      k: 1, m: 1, n: 4, p: 2, A: [[1, -1, 0, 0]], B: [[2, 0], [2, 0], [2, 6], [0, 6]]
    },
    point: {
      name: "单点空间", description: "一个顶点，没有边。普通零维同调取 C₋₁ = 0，顶点生成 H₀ ≅ ℤ。",
      k: 0, m: 0, n: 1, p: 0, A: [], B: [[]]
    }
  };

  function getExample(id) {
    if (!Object.prototype.hasOwnProperty.call(examples, id)) throw new Error("未知的链复形示例。");
    const {A, B, ...details} = examples[id];
    return {id, ...details, A: A.map(row => row.slice()), B: B.map(row => row.slice())};
  }

  function serialize(matrix) {
    if (matrix.length === 0 || matrix[0].length === 0) return "";
    return matrix.map(row => row.join(" ")).join("\n");
  }

  const api = {parse, getExample, serialize};
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ChainInput = api;
})(globalThis);
