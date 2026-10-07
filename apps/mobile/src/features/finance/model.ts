import type { Jar } from "@hu/domain";

export function buildOverviewSummary(jars: Jar[]) {
  const spendable = jars.filter((jar) => !jar.isSavings);
  const savings = jars.filter((jar) => jar.isSavings);
  const budget = spendable.reduce((sum, jar) => sum + jar.monthlyBudget, 0);
  const spent = spendable.reduce((sum, jar) => sum + jar.spent, 0);

  return {
    budget,
    spent,
    remaining: budget - spent,
    saved: savings.reduce((sum, jar) => sum + (jar.monthlyBudget - jar.spent), 0),
    spendableJarCount: spendable.length,
    savingsJarCount: savings.length,
  };
}

export function jarLabel(jar: Pick<Jar, "name" | "isShared" | "isSavings">): string {
  return jar.isShared ? `${jar.name} (gia đình)` : jar.isSavings ? `${jar.name} (tiết kiệm)` : jar.name;
}

export function amountFromText(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function mutationBlockedMessage(isOnline: boolean): string | null {
  return isOnline ? null : "Bạn đang offline. Kết nối mạng để lưu thay đổi.";
}
