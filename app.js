(() => {
  "use strict";
  const byId = id => document.getElementById(id);
  const digits = ["₀₁₂₃₄₅₆₇₈₉", "⁰¹²³⁴⁵⁶⁷⁸⁹"];
  const script = (value, upper = false) => String(value).replace(/\d/g, d => digits[Number(upper)][Number(d)]);
  const showVector = values => "(" + values.join(", ") + ")ᵀ";
  const chainGroup = rank => rank === 0 ? "0" : rank === 1 ? "ℤ" : "ℤ" + script(rank, true);
  let report = null;
  let exampleDescription = "";

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function dimension(id, max) {
    const input = byId(id);
    return input.value !== "" && input.validity.valid && Number.isInteger(input.valueAsNumber) &&
      input.valueAsNumber >= 0 && input.valueAsNumber <= max ? input.valueAsNumber : null;
  }
  function dims() {
    return {k:dimension("degree",99),m:dimension("dim-m",12),n:dimension("dim-n",12),p:dimension("dim-p",12)};
  }
  function diagram() {
    const {k,m,n,p} = dims();
    for (const [id,d] of [["m",m],["n",n],["p",p]]) byId("group-" + id).textContent = d === null ? "?" : chainGroup(d);
    byId("shape-A").textContent = (m ?? "?") + " × " + (n ?? "?");
    byId("shape-B").textContent = (n ?? "?") + " × " + (p ?? "?");
    byId("map-A").textContent = "= ∂" + (k === null ? "ₖ" : script(k));
    byId("map-B").textContent = "= ∂" + (k === null ? "ₖ₊₁" : script(k+1));
    byId("example-note").textContent = exampleDescription || "列向量约定。B 先作用，A 后作用。";
    byId("mat-A").rows = Math.max(2,Math.min(m ?? 2,6));
    byId("mat-B").rows = Math.max(2,Math.min(n ?? 2,6));
  }
  function invalidate() {
    report = null;
    byId("export").disabled = true;
    byId("live").className = "";
    byId("live").textContent = "";
    byId("result").replaceChildren(element("p","pending-box","矩阵或次数已修改。点击「计算同调群」查看新结果。"));
  }
  function multiply(matrix, vector) {
    return matrix.map(row => row.reduce((total,x,j) => total + BigInt(x) * vector[j], 0n));
  }
  function rowsFor(problem, result) {
    return [...result.free, ...result.torsion].map((g,i) => {
      const index = i + 1;
      const cycle = "z" + script(index);
      const az = multiply(problem.A,g.cycle);
      if (az.some(x => x !== 0n)) throw Error("闭链代表复核失败。");
      const checks = ["A" + cycle + " = " + showVector(az)];
      if (g.order !== undefined) {
        const bw = multiply(problem.B,g.witness);
        const dz = g.cycle.map(x => x * g.order);
        if (bw.some((x,j) => x !== dz[j])) throw Error("挠元边界关系复核失败。");
        checks.push("w = " + showVector(g.witness), "Bw = " + showVector(bw) + " = " + g.order + cycle);
      }
      return {kind:g.order === undefined ? "自由生成元" : g.order + " 阶挠元", finite:g.order !== undefined,
        vector:cycle + " = " + showVector(g.cycle), checks};
    });
  }
  function present(problem, result) {
    const pieces = [];
    if (result.freeRank) pieces.push(chainGroup(result.freeRank));
    for (const t of result.torsion) pieces.push("ℤ/" + t.order + "ℤ");
    const group = "H" + script(problem.k) + " ≅ " + (pieces.join(" ⊕ ") || "0");
    const rows = rowsFor(problem,result);
    const answer = element("div","answer");
    answer.append(element("p","group",group));
    const stats = element("div","stats");
    for (const [label,num] of [["自由秩",result.freeRank],["rank A",result.rankA],["rank B",result.rankB]]) {
      const s = element("span","",label);
      s.append(element("b","",num));
      stats.append(s);
    }
    answer.append(stats);
    const gen = element("section","generators");
    gen.append(element("h3","","原坐标中的生成元"));
    const lines = [];
    for (const row of rows) {
      const entry = element("article","generator");
      entry.append(element("span",row.finite ? "kind torsion" : "kind",row.kind),element("p","vector",row.vector));
      const checks = element("details","checks");
      checks.append(element("summary","",row.finite ? "核对闭链与边界" : "核对闭链"));
      for (const line of row.checks) checks.append(element("p","",line));
      entry.append(checks);
      gen.append(entry);
      lines.push(row.kind + "  " + row.vector, ...row.checks, "");
    }
    if (!rows.length) {
      const zero = "每条闭链都是边界，同调群为零。";
      gen.append(element("p","hint zero",zero));
      lines.push(zero);
    }
    byId("live").textContent = "已验证 A × B = 0";
    byId("live").className = "";
    byId("result").replaceChildren(answer,gen);
    const displayMatrix = matrix => ChainInput.serialize(matrix) || "（空矩阵）";
    report = ["链谱 · 整数同调计算", group,
      "m = " + problem.m + ", n = " + problem.n + ", p = " + problem.p,
      "rank A = " + result.rankA + ", rank B = " + result.rankB + ", 自由秩 = " + result.freeRank,
      "", "A =", displayMatrix(problem.A), "", "B =", displayMatrix(problem.B), "", "AB = 0", "", ...lines].join("\n");
    byId("export").disabled = false;
  }
  function compute() {
    invalidate();
    try {
      const d = dims();
      if (Object.values(d).includes(null)) throw Error("请填写有效的次数和矩阵维数。");
      const problem = {...d,A:ChainInput.parse(byId("mat-A").value,d.m,d.n,"矩阵 A"),
        B:ChainInput.parse(byId("mat-B").value,d.n,d.p,"矩阵 B")};
      present(problem,IntegerHomology.compute(problem));
    } catch (error) {
      byId("live").className = "error";
      byId("live").textContent = error.message;
      byId("result").replaceChildren(element("p","pending-box","请根据提示调整输入，然后重新计算。"));
    }
  }
  function loadExample(id) {
    const data = ChainInput.getExample(id);
    byId("examples").value = id;
    byId("degree").value = data.k;
    for (const s of ["m","n","p"]) byId("dim-" + s).value = data[s];
    byId("mat-A").value = ChainInput.serialize(data.A);
    byId("mat-B").value = ChainInput.serialize(data.B);
    exampleDescription = data.description;
    diagram();
    compute();
  }
  byId("matrices").addEventListener("input",() => {
    byId("examples").value = "custom";
    exampleDescription = "";
    diagram();
    invalidate();
  });
  byId("matrices").addEventListener("submit",event => { event.preventDefault(); compute(); });
  byId("examples").addEventListener("change", event => loadExample(event.target.value));
  byId("method").addEventListener("click",() => byId("method-dialog").showModal());
  byId("close-method").addEventListener("click",() => byId("method-dialog").close());
  byId("export").addEventListener("click",() => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob(["\uFEFF",report,"\n"],{type:"text/plain;charset=utf-8"}));
    const link = element("a");
    link.href = url;
    link.download = "整数同调-H" + byId("degree").value + ".txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  });
  loadExample("klein");
})();
