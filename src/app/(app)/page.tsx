import Link from "next/link";
import { Banner } from "@/components/ui";
import { budgetShare, calculateSpendingPace, withDistinctJarColors } from "@hu/domain";
import { BudgetSplitChart, WeekTrendChart } from "@/components/overview-charts";
import { SpendingPaceCard } from "@/components/spending-pace-card";
import { DebtsOverviewCard } from "@/components/debts-overview-card";
import { listDebts } from "@hu/data";
import { EditableTransaction } from "@/components/editable-transaction";
import { Icon } from "@/components/icon";
import { formatVND, vnNow, vnToday } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { jarLabel, jarStats, listJarsWithSpent, totalBudget, totalSpent } from "@/lib/queries/jars";
import { listRecentTransactions, listTransactionsSince, toYMD, weekdayShort } from "@/lib/queries/transactions";
import { applyAutoRollovers, getPendingLeftovers, previousMonthLabel } from "@/lib/queries/leftover";
import { LeftoverBanner } from "@/components/leftover-banner";
import { ProductTour } from "@/components/product-tour";

function daysLeftInMonth(): number {
  const now = vnNow();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(1, lastDay - now.getDate() + 1);
}

function periodLabel(): string {
  const now = vnNow();
  return `Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;
}

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const { tour } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null; // middleware da redirect ve /login, day chi de TypeScript yen tam
  }

  // Hu co bat rollover: tu cong tien du thang truoc vao chinh hu, khong
  // can hoi — chay truoc listJarsWithSpent de ngan sach moi cong duoc phan
  // anh ngay trong lan tai trang nay. Loi (vd chua chay migration 007) bi
  // nuot de khong lam sap Dashboard — chi la tinh nang phu.
  const jarsAfterRollover = applyAutoRollovers(supabase, user.id)
    .catch(() => {})
    .then(() => listJarsWithSpent(supabase));

  // 7 ngay gan nhat, gop theo ngay tu giao dich that.
  const today = vnNow();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);

  // Cac query doc doc lap nhau — chay song song thay vi noi duoi (moi lan
  // await la 1 round-trip toi Supabase).
  const [rawJars, pendingLeftovers, last7, recent, hasSeenTour, debts] = await Promise.all([
    jarsAfterRollover,
    getPendingLeftovers(supabase, user.id).catch(() => []),
    listTransactionsSince(supabase, toYMD(sevenDaysAgo)),
    listRecentTransactions(supabase, 4),
    // Product tour — nuot loi neu chua chay migration_010, coi nhu da xem
    // (khong lam phien user bang tour khi tinh nang phu nay bi loi).
    (async () => {
      try {
        const { data } = await supabase.from("profiles").select("has_seen_tour").eq("id", user.id).maybeSingle();
        return data?.has_seen_tour ?? true;
      } catch {
        return true;
      }
    })(),
    // Khoan no la tinh nang phu: chua chay migration 013 thi bo qua, khong lam sap Tong quan.
    listDebts(supabase).catch(() => []),
  ]);
  // Hu cu co the trung mau (hu tuy chinh truoc day deu nhan cung 1 mau) — chi doi mau luc hien thi de bieu do tach duoc tung hu.
  const jars = withDistinctJarColors(rawJars);
  // Hu tiet kiem khong tinh vao "Con lai" co the tieu — khong phai tien de
  // chi, va rut/gan-het cua no khong nen kich hoat canh bao "vuot ngan
  // sach" kieu chi tieu thuong. Luoi "Tinh trang cac hu" ben duoi van hien
  // du (khong loc), chi doi cach hien thi rieng cho tung tile.
  const spendableJars = jars.filter((j) => !j.isSavings);
  const savingsJars = jars.filter((j) => j.isSavings);
  const budgetSum = totalBudget(spendableJars);
  const spentSum = totalSpent(spendableJars);
  const remaining = budgetSum - spentSum;

  const overJar = spendableJars.find((j) => jarStats(j, formatVND).over);
  const nearJar = spendableJars.find((j) => jarStats(j, formatVND).near);
  // Canh bao du doan: hu chua vuot/gan vuot thuc te, nhung voi toc do chi
  // hien tai se vuot ngan sach truoc khi het thang.
  const predictJar = spendableJars.find((j) => j.id !== nearJar?.id && jarStats(j, formatVND).willExceed);
  const alert = [
    overJar && `${overJar.name} vượt ${jarStats(overJar, formatVND).leftAmount}`,
    nearJar && `${nearJar.name} đã dùng ${jarStats(nearJar, formatVND).pctLabel}`,
    predictJar && `${predictJar.name} có thể vượt ~${formatVND(jarStats(predictJar, formatVND).projectedOverAmount)} nếu chi tiếp với tốc độ này`,
  ]
    .filter(Boolean)
    .join(" · ");

  // Khoan nap khong phai "da chi" — loai khoi bieu do chi 7 ngay qua.
  const spendLast7 = last7.filter((t) => t.type !== "deposit");
  const totalsByDate = new Map<string, number>();
  for (const t of spendLast7) totalsByDate.set(t.transactionDate, (totalsByDate.get(t.transactionDate) ?? 0) + t.amount);
  const week: { date: string; label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ymd = toYMD(d);
    week.push({ date: ymd, label: weekdayShort(ymd), value: totalsByDate.get(ymd) ?? 0 });
  }
  const weekTotal = week.reduce((s, d) => s + d.value, 0);

  const pace = calculateSpendingPace(jars, today);
  // Ti trong tinh tren tong ngan sach MOI hu (ke ca hu tiet kiem) — "chia het cac hu" nhu goi y % thu nhap cua mau hu.
  const allBudget = totalBudget(jars);
  const daysLeft = daysLeftInMonth();
  const tourOpen = tour === "1" || !hasSeenTour;

  return (
    <div className="page-stack">
      <div className="page-header flex-wrap">
        <div className="mr-auto"><p className="eyebrow">BỨC TRANH TÀI CHÍNH</p><h1>Tổng quan</h1><p>{periodLabel()}</p></div>
        <Link data-tour="add-transaction-desktop" href="/transactions/new" className="btn btn-primary hidden md:inline-flex">
          Nhập giao dịch
        </Link>
      </div>

      {jars.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Icon name="wallet" className="h-8 w-8 text-neutral-500" />
          <p className="text-sm text-neutral-700">Chưa có hũ ngân sách nào. Tạo hũ đầu tiên để bắt đầu theo dõi.</p>
          <Link data-tour="empty-create-jar" href="/jars/new" className="btn btn-primary">
            Tạo hũ mới
          </Link>
        </div>
      ) : (
        <>
          <div data-tour="remaining-summary" className="rounded-card border border-divider bg-[#E5EEE9] p-5 shadow-sm md:p-6">
            <div>
              <div className="eyebrow">CÒN CÓ THỂ CHI</div>
              <div className="mt-1.5 font-heading text-4xl font-extrabold tabular-nums md:text-[40px]">{formatVND(remaining)}</div>
              <div className="mt-1 text-xs text-neutral-700">
                VND · ngân sách {formatVND(budgetSum)} chia vào {spendableJars.length} hũ · còn {daysLeft} ngày
              </div>
              {savingsJars.length > 0 && (
                <div className="mt-1 text-xs text-neutral-700">
                  Đã tiết kiệm được {formatVND(Math.max(0, totalBudget(savingsJars) - totalSpent(savingsJars)))} qua {savingsJars.length} hũ
                </div>
              )}
            </div>
            <div className="mt-4">
              <BudgetSplitChart jars={spendableJars} budgetSum={budgetSum} />
            </div>
          </div>

          <SpendingPaceCard pace={pace} />

          <DebtsOverviewCard debts={debts} today={vnToday()} />

          {alert && (
            <Banner icon="triangle-alert" tone="accent">
              <span className="font-semibold">{alert}</span>
            </Banner>
          )}

          {pendingLeftovers.length > 0 && <LeftoverBanner items={pendingLeftovers} monthLabel={previousMonthLabel()} />}

          <div>
            <div className="mb-2 text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Tình trạng các hũ</div>
            <div data-tour="jars-grid" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {jars.map((jar, i) => {
                const s = jarStats(jar, formatVND);
                const isLastOdd = i === jars.length - 1 && jars.length % 2 === 1;
                return (
                  <Link
                    key={jar.id}
                    href={`/jars/${jar.id}`}
                    className={`block rounded-card border border-divider bg-surface p-4 shadow-sm transition-transform hover:-translate-y-0.5 ${isLastOdd ? "sm:col-span-2 lg:col-span-1" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name={jar.icon} className="h-4 w-4" style={{ color: jar.color }} />
                      <span className="text-[12px] font-semibold">{jarLabel(jar)}</span>
                      {jar.isShared && <Icon name="users" className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-label="Hũ quỹ chung" />}
                      {jar.isSavings && <Icon name="piggy-bank" className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-label="Hũ tiết kiệm" />}
                      <span className="ml-auto shrink-0 text-[11px] tabular-nums text-neutral-700" title="Tỉ trọng ngân sách của hũ trong tổng các hũ">
                        {budgetShare(jar, allBudget)}% tổng
                      </span>
                    </div>
                    <div className="mt-2 font-heading text-[19px] font-extrabold tabular-nums" style={{ color: s.inkColor }}>
                      {!jar.isSavings && s.over ? "−" : ""}
                      {s.leftAmount}
                    </div>
                    <div className="text-[11px] text-neutral-700 tabular-nums">
                      {jar.isSavings ? "đã tiết kiệm, cộng dồn" : `${s.leftWord}, trên ${formatVND(jar.monthlyBudget)}`}
                    </div>
                    <div className="mt-2.5 flex bg-neutral-300" style={{ height: 5 }}>
                      <div style={{ width: `${s.pct}%`, background: s.barColor }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_300px]">
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Chi 7 ngày qua</div>
                <div className="text-[11px] tabular-nums text-neutral-700">TB {formatVND(weekTotal / 7)}/ngày</div>
              </div>
              <WeekTrendChart week={week} />
            </div>

            <div data-tour="recent-transactions">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Giao dịch gần nhất</div>
                <Link href="/transactions" className="text-xs text-accent">
                  Tất cả
                </Link>
              </div>
              <div className="flex flex-col">
                {recent.length === 0 && <p className="py-2.5 text-[13px] text-neutral-700">Chưa có giao dịch nào.</p>}
                {recent.map((t) => (
                  <EditableTransaction key={t.id} transaction={t} jars={jars} canDelete={t.userId === user.id}>
                    <div className="flex items-center gap-2.5 border-b border-divider py-2.5 text-[13px] last:border-b-0">
                      <span className="flex-1">{t.note || t.jarName}</span>
                      <span className="tabular-nums" style={t.type === "deposit" ? { color: "var(--color-green-ink)" } : undefined}>
                        {t.type === "deposit" ? "+" : ""}
                        {formatVND(t.amount)}
                      </span>
                    </div>
                  </EditableTransaction>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <ProductTour initialOpen={tourOpen} hasJars={jars.length > 0} />
    </div>
  );
}
