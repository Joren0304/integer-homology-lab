# 链谱 · 整数同调计算器

给定两个相邻的整数边界矩阵，链谱在浏览器里计算 $H_k=\ker A/\operatorname{im}B$，并用输入矩阵的原始坐标列出每个生成元。这适合核对代数拓扑习题，也适合在课堂上演示一条闭链为何会产生挠元。[打开计算器](https://joren0304.github.io/integer-homology-lab/)

离线使用时，下载并解压源码 ZIP，用支持 `BigInt` 的浏览器打开 `dist/index.html`。请保留 `dist` 目录内文件的相对位置。计算在本机完成，无需安装依赖。[下载 v0.1.0 源码 ZIP](https://github.com/Joren0304/integer-homology-lab/archive/refs/tags/v0.1.0.zip)

## 输入一段链复形

| 矩阵 | 边界映射 | 大小 |
| --- | --- | --- |
| $A=\partial_k$ | 从 $C_k$ 到 $C_{k-1}$ | $m\times n$ |
| $B=\partial_{k+1}$ | 从 $C_{k+1}$ 到 $C_k$ | $n\times p$ |

链写作列向量，每一列是一个基元素的边界。两个矩阵须满足 $AB=0$，即任何边界再取一次边界都为零。

填入 $m,n,p$，再逐行输入矩阵，同行元素用空格或逗号分隔。零行或零列矩阵留空。三项秩均可取 0 至 12，每个整数最多 18 位十进制数字，正负号不计入。选择「计算同调群」即可查看结果，也可导出为文本。运算使用精确的 `BigInt` 整数，中间计算超出资源限制时会停止并提示。

## 手算示例 · 克莱因瓶的第一同调群

取一个顶点、两条有向边 $a,b$ 和一个面 $f$。两条边都是闭链，选定向使面的边界为 $2b$。输入 $m=1$、$n=2$、$p=1$。

| $A$ 的一行 | $B$ 的两行 |
| --- | --- |
| `0 0` | `0`<br>`2` |

结果为 $H_1\cong\mathbb Z\oplus\mathbb Z/2\mathbb Z$。边 $a$ 代表一个自由生成元。边 $b$ 不是边界，但两倍的 $b$ 恰好是 $f$ 的边界，所以 $[b]$ 的阶为 2。

一般地，对每个输出的代表元 $z$，可代回验证 $Az=0$。对阶为 $d$ 的挠元，还会得到一条高一维的链 $w$，可验证 $Bw=dz$。这条等式说明 $d[z]=0$。其中 $d$ 是使该等式在同调群中成立的最小正整数，由整数矩阵的 Smith 标准形确定。改变基或定向，可能得到不同的代表向量，但同调群不变。

## 开发与参考

在仓库根目录运行测试。测试使用 Node.js 内置测试运行器。

```sh
node --test test/*.test.cjs
```

SageMath 的 `ChainComplex.homology(generators=True)` 也能计算整数同调并返回生成元，可用于脚本计算与交叉核对。[SageMath 文档](https://doc.sagemath.org/html/en/reference/homology/sage/homology/chain_complex.html) · [SageMath 实现](https://github.com/sagemath/sage/blob/develop/src/sage/homology/chain_complex.py)

本项目采用 [MIT 许可证](LICENSE)。
