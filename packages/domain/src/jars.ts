import type { Jar } from "./types";

export type JarStats = {
  left: number;
  pct: number;
  over: boolean;
  near: boolean;
  willExceed: boolean;
  projectedSpent: number;
  projectedOverAmount: number;
};

const MIN_DAYS_FOR_PREDICTION = 3;

export function calculateJarStats(jar: Jar, now: Date): JarStats {
  const left = jar.monthlyBudget - jar.spent;
  const ratio = jar.monthlyBudget > 0 ? jar.spent / jar.monthlyBudget : 0;
  const over = left < 0;
  const near = !over && jar.alertAt80 && ratio >= 0.8;
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const canPredict = jar.monthlyBudget > 0 && dayOfMonth >= MIN_DAYS_FOR_PREDICTION;
  const projectedSpent = canPredict ? (jar.spent / dayOfMonth) * daysInMonth : jar.spent;
  const willExceed = jar.alertAt80 && !over && canPredict && projectedSpent > jar.monthlyBudget;

  return {
    left,
    // Hũ tiết kiệm nạp nhiều hơn rút có spent âm; phần trăm không được âm (nhãn "-50%", chiều rộng thanh tiến độ âm).
    pct: Math.max(0, Math.min(100, Math.round(ratio * 100))),
    over,
    near,
    willExceed,
    projectedSpent,
    projectedOverAmount: Math.max(0, projectedSpent - jar.monthlyBudget),
  };
}

export function totalBudget(jars: Jar[]): number {
  return jars.reduce((sum, jar) => sum + jar.monthlyBudget, 0);
}

export function totalSpent(jars: Jar[]): number {
  return jars.reduce((sum, jar) => sum + jar.spent, 0);
}
