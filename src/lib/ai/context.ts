import type { SupabaseClient } from "@supabase/supabase-js";
import { vnNow } from "@/lib/format";
import { currentMonthStart, listJarsWithSpent } from "@/lib/queries/jars";
import { formatVND } from "@/lib/format";

export type AiJarSummary = {
  name: string;
  monthlyBudget: number;
  spent: number;
  remaining: number;
  /** Chi trung binh/thang trong 3 thang gan nhat (khong tinh thang nay dang chay dang). */
  avgSpent3m: number;
  isSavings: boolean;
};

export type AiContext = {
  jars: AiJarSummary[];
  totalBudget: number;
  totalSpent: number;
  currentMonthLabel: string;
};

/** Tap hop du lieu tai chinh (hu ca nhan) cua user hien tai de dua vao
 * prompt AI — dung chung cho "AI phan bo luong" va Chatbot. Chi doc du
 * lieu tu Supabase, khong goi API AI o day. Day chinh la phan dong vai
 * tro RPC get_ai_context() nhac trong build-plan — hien lam o tang
 * TypeScript thay vi 1 ham Postgres rieng, de de test/sua bang tsc/lint
 * ma khong can trien khai qua Supabase truoc. */
// Khong nhan userId rieng — listJarsWithSpent/RLS da tu gioi han theo
// nguoi dang dang nhap, truyen them userId o day se chi la tham so chet.
export async function getAiContext(supabase: SupabaseClient): Promise<AiContext> {
  const jars = await listJarsWithSpent(supabase);
  const personalJars = jars.filter((j) => !j.isShared);

  const threeMonthsAgoStart = (() => {
    const now = vnNow();
    const d = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();
  const monthNow = currentMonthStart();

  const jarIds = personalJars.map((j) => j.id);
  const { data: txs } = jarIds.length
    ? await supabase
        .from("transactions")
        .select("jar_id, amount, type")
        .in("jar_id", jarIds)
        .gte("transaction_date", threeMonthsAgoStart)
        .lt("transaction_date", monthNow)
    : { data: [] as { jar_id: string; amount: number; type: string }[] };

  // Khoan nap (vao hu tiet kiem) khong phai "da chi" — bo qua khi tinh
  // trung binh chi/thang, tranh AI hieu nham nap tien la tieu tien.
  const spentByJar = new Map<string, number>();
  for (const t of txs ?? []) {
    if (t.type === "deposit") continue;
    spentByJar.set(t.jar_id, (spentByJar.get(t.jar_id) ?? 0) + Number(t.amount));
  }

  const jarSummaries: AiJarSummary[] = personalJars.map((j) => ({
    name: j.name,
    monthlyBudget: j.monthlyBudget,
    spent: j.spent,
    remaining: j.monthlyBudget - j.spent,
    avgSpent3m: Math.round((spentByJar.get(j.id) ?? 0) / 3),
    isSavings: j.isSavings,
  }));

  return {
    jars: jarSummaries,
    totalBudget: personalJars.reduce((s, j) => s + j.monthlyBudget, 0),
    totalSpent: personalJars.reduce((s, j) => s + j.spent, 0),
    currentMonthLabel: `Tháng ${vnNow().getMonth() + 1}, ${vnNow().getFullYear()}`,
  };
}

/** Bien AiContext thanh 1 doan text de nhet vao system/user prompt. */
export function formatAiContext(ctx: AiContext): string {
  const lines = ctx.jars.map(
    (j) =>
      `- ${j.name}${j.isSavings ? " (hũ tiết kiệm, tích luỹ dần)" : ""}: ngân sách ${formatVND(j.monthlyBudget)}đ, đã chi ${formatVND(j.spent)}đ tháng này, trung bình chi ${formatVND(j.avgSpent3m)}đ/tháng (3 tháng gần nhất)`
  );
  return [
    `${ctx.currentMonthLabel}. Tổng ngân sách hũ cá nhân: ${formatVND(ctx.totalBudget)}đ, đã chi: ${formatVND(ctx.totalSpent)}đ.`,
    "Các hũ cá nhân:",
    ...lines,
  ].join("\n");
}


// ------------------------------------------------------------
// Context "mo rong" — them xu huong thu nhap/tiet kiem NHIEU THANG + no
// hien tai, dung rieng cho Chatbot khi can danh gia 1 quyet dinh tai
// chinh lon (vd "mua xe tra gop co on khong") — KHONG dung cho AI phan bo
// luong (ai-actions.ts) de khong lam cham/ton them token cho tac vu don
// gian hon o do.
// ------------------------------------------------------------

export type AiFinancialTrends = {
  /** false neu chua co thang nao tung bam "Ap dung" o /allocate (chua co
   * du lieu incomes) — luc do avg... o duoi deu la 0, PHAI noi ro voi AI
   * de no khong bia so. */
  hasIncomeHistory: boolean;
  monthsCounted: number;
  avgMonthlyIncome: number;
  avgMonthlyPersonalSpend: number;
  avgMonthlySurplus: number;
};

export type ExtendedAiContext = AiContext & {
  trends: AiFinancialTrends;
};

const TRENDS_MONTHS_BACK = 6;

/** Nhu getAiContext() nhung them thu nhap/chi tieu/tiet kiem trung binh 6
 * thang gan nhat (dua vao lich su incomes/jar_allocations tu migration_008
 * — KHONG co thi hasIncomeHistory=false). Dung khi Chatbot can danh gia 1
 * quyet dinh tai chinh lon (vay mua xe/nha...) thay vi chi hoi/dap ngan. */
export async function getExtendedAiContext(supabase: SupabaseClient): Promise<ExtendedAiContext> {
  const base = await getAiContext(supabase);

  const allJars = await listJarsWithSpent(supabase);
  const personalJarIds = allJars.filter((j) => !j.isShared).map((j) => j.id);

  const sixMonthsAgoStart = (() => {
    const now = vnNow();
    const d = new Date(now.getFullYear(), now.getMonth() - TRENDS_MONTHS_BACK, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();
  const monthNow = currentMonthStart();

  const [{ data: incomeRows }, { data: txRows }] = await Promise.all([
    supabase.from("incomes").select("period_month, amount").gte("period_month", sixMonthsAgoStart).lt("period_month", monthNow),
    personalJarIds.length
      ? supabase
          .from("transactions")
          .select("amount, transaction_date, type")
          .in("jar_id", personalJarIds)
          .gte("transaction_date", sixMonthsAgoStart)
          .lt("transaction_date", monthNow)
      : Promise.resolve({ data: [] as { amount: number; transaction_date: string; type: string }[] }),
  ]);

  const incomeByMonth = new Map<string, number>();
  for (const r of incomeRows ?? []) incomeByMonth.set(r.period_month as string, Number(r.amount));

  // Khoan nap (vao hu tiet kiem) khong phai "da chi" — bo qua, khong thi
  // "du ra moi thang" (avgMonthlySurplus) se bi tinh THAP hon thuc te.
  const spentByMonth = new Map<string, number>();
  for (const t of txRows ?? []) {
    if (t.type === "deposit") continue;
    const period = `${(t.transaction_date as string).slice(0, 7)}-01`;
    spentByMonth.set(period, (spentByMonth.get(period) ?? 0) + Number(t.amount));
  }

  const monthsWithIncome = [...incomeByMonth.keys()];
  const monthsCounted = monthsWithIncome.length;
  const avgMonthlyIncome = monthsCounted ? monthsWithIncome.reduce((s, m) => s + (incomeByMonth.get(m) ?? 0), 0) / monthsCounted : 0;
  const avgMonthlyPersonalSpend = monthsCounted ? monthsWithIncome.reduce((s, m) => s + (spentByMonth.get(m) ?? 0), 0) / monthsCounted : 0;

  return {
    ...base,
    trends: {
      hasIncomeHistory: monthsCounted > 0,
      monthsCounted,
      avgMonthlyIncome: Math.round(avgMonthlyIncome),
      avgMonthlyPersonalSpend: Math.round(avgMonthlyPersonalSpend),
      avgMonthlySurplus: Math.round(avgMonthlyIncome - avgMonthlyPersonalSpend),
    },
  };
}

export function formatExtendedAiContext(ctx: ExtendedAiContext): string {
  const base = formatAiContext(ctx);

  const trendLine = ctx.trends.hasIncomeHistory
    ? `Trung bình ${ctx.trends.monthsCounted} tháng gần nhất (dựa trên lịch sử "Chia lương"): thu nhập ~${formatVND(ctx.trends.avgMonthlyIncome)}đ/tháng, chi tiêu hũ cá nhân ~${formatVND(ctx.trends.avgMonthlyPersonalSpend)}đ/tháng, dư ra ~${formatVND(ctx.trends.avgMonthlySurplus)}đ/tháng.`
    : `Chưa có đủ lịch sử "Chia lương" nhiều tháng để tính thu nhập/tiết kiệm trung bình dài hạn — chỉ dựa được vào dữ liệu tháng hiện tại ở trên, KHÔNG được tự suy diễn hoặc bịa số cho các tháng trước.`;

  return [base, trendLine].join("\n");
}
