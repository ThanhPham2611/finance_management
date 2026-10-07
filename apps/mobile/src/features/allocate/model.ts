// Phép tính của trang Chia lương, cùng quy tắc với src/components/allocate-client.tsx (web).

/** Chia đều `count` hũ theo %, làm tròn 0,1; hũ cuối nhận phần lẻ để tổng đúng 100. */
export function equalSplit(count: number): number[] {
  if (count === 0) return [];
  const base = Math.floor((100 / count) * 10) / 10;
  const pcts: number[] = Array(count).fill(base);
  const used = pcts.reduce((sum, value) => sum + value, 0);
  pcts[pcts.length - 1] = Math.max(0, Math.round((100 - used + base) * 10) / 10);
  return pcts;
}

/** % ban đầu của từng hũ theo tỷ lệ ngân sách hiện tại. */
export function initialPcts(budgets: number[]): number[] {
  const total = budgets.reduce((sum, value) => sum + value, 0);
  return budgets.map((value) => (total ? (value / total) * 100 : 0));
}

export const clampPct = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

export const formatPct = (value: number) => value.toFixed(1).replace(/\.0$/, "");

/** Sửa SỐ TIỀN của 1 hũ: các hũ còn lại tự chia lại phần thiếu/dư theo tỷ lệ hiện có (chia đều nếu chúng đang đều bằng 0). */
export function rebalanceByAmount(pcts: number[], index: number, newAmount: number, incomeForPersonal: number): number[] {
  if (!incomeForPersonal) return pcts;
  const newPct = (Math.max(0, newAmount) / incomeForPersonal) * 100;
  const others = pcts.map((_, i) => i).filter((i) => i !== index);
  const othersSum = others.reduce((sum, i) => sum + pcts[i], 0);
  const target = Math.max(0, 100 - newPct);
  const next = [...pcts];
  next[index] = newPct;
  for (const i of others) next[i] = othersSum === 0 ? target / others.length : (pcts[i] / othersSum) * target;
  return next;
}

/** "Chia hết phần dư vào hũ cuối": cộng phần chưa phân bổ (hoặc trừ phần vượt) vào hũ cuối, giữ trong 0–100. */
export function fillRemainder(pcts: number[]): number[] {
  const rest = 100 - pcts.reduce((sum, value) => sum + value, 0);
  if (Math.abs(rest) < 0.01 || pcts.length === 0) return pcts;
  const next = [...pcts];
  const last = next.length - 1;
  next[last] = Math.max(0, Math.min(100, next[last] + rest));
  return next;
}

export function allocationSummary(pcts: number[], incomeForPersonal: number) {
  const leftPct = 100 - pcts.reduce((sum, value) => sum + value, 0);
  return { leftPct, leftAmount: (incomeForPersonal * leftPct) / 100, over: leftPct < -0.01, exact: Math.abs(leftPct) < 0.01 };
}

export function toAllocations(jars: { id: string }[], pcts: number[], incomeForPersonal: number) {
  return jars.map((jar, i) => ({ jarId: jar.id, monthlyBudget: Math.round((incomeForPersonal * pcts[i]) / 100), pct: pcts[i] }));
}
