import Link from "next/link";
import { Banner } from "@/components/ui";
import { BudgetSplitChart, WeekTrendChart } from "@/components/overview-charts";
import { EditableTransaction } from "@/components/editable-transaction";
import { Icon } from "@/components/icon";
import { formatVND, vnNow } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { aggregateFamilyJar, jarStats, listJarsWithSpent, totalBudget, totalSpent } from "@/lib/queries/jars";
import { listRecentTransactions, listTransactionsSince, toYMD, weekdayShort } from "@/lib/queries/transactions";
import { applyAutoRollovers, getPendingLeftovers, previousMonthLabel } from "@/lib/queries/leftover";
import { LeftoverBanner } from "@/components/leftover-banner";
import { computeStreak, getRecentMonthsPerformance } from "@/lib/queries/gamification";

function daysLeftInMonth(): number {
  const now = vnNow();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(1, lastDay - now.getDate() + 1);
}

function periodLabel(): string {
  const now = vnNow();
  return `Tháng ${now.getMonth() + 1}, ${now.getFullYear()}`;
}

export default async function DashboardPage() {
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
  await applyAutoRollovers(supabase, user.id).catch(() => {});

  const jars = await listJarsWithSpent(supabase);
  const pendingLeftovers = await getPendingLeftovers(supabase, user.id).catch(() => []);
  // Streak gamification — chi doc, khong bao gio lam sap Dashboard neu loi
  // (vd chua chay migration_008, hoac chua tung chia luong thang nao).
  const streak = await getRecentMonthsPerformance(supabase, user.id, 12)
    .then(computeStreak)
    .catch(() => 0);
  const personalJars = jars.filter((j) => !j.isShared);
  const familyJars = jars.filter((j) => j.isShared);
  const displayJars = familyJars.length > 0 ? [...personalJars, aggregateFamilyJar(familyJars)] : personalJars;
  const budgetSum = totalBudget(jars);
  const spentSum = totalSpent(jars);
  const remaining = budgetSum - spentSum;

  const overJar = jars.find((j) => jarStats(j, formatVND).over);
  const nearJar = jars.find((j) => jarStats(j, formatVND).near);
  // Canh bao du doan: hu chua vuot/gan vuot thuc te, nhung voi toc do chi
  // hien tai se vuot ngan sach truoc khi het thang.
  const predictJar = jars.find((j) => j.id !== nearJar?.id && jarStats(j, formatVND).willExceed);
  const alert = [
    overJar && `${overJar.name} vượt ${jarStats(overJar, formatVND).leftAmount}`,
    nearJar && `${nearJar.name} đã dùng ${jarStats(nearJar, formatVND).pctLabel}`,
    predictJar && `${predictJar.name} có thể vượt ~${formatVND(jarStats(predictJar, formatVND).projectedOverAmount)} nếu chi tiếp với tốc độ này`,
  ]
    .filter(Boolean)
    .join(" · ");

  // 7 ngay gan nhat, gop theo ngay tu giao dich that.
  const today = vnNow();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const last7 = await listTransactionsSince(supabase, toYMD(sevenDaysAgo));
  const totalsByDate = new Map<string, number>();
  for (const t of last7) totalsByDate.set(t.transactionDate, (totalsByDate.get(t.transactionDate) ?? 0) + t.amount);
  const week: { date: string; label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const ymd = toYMD(d);
    week.push({ date: ymd, label: weekdayShort(ymd), value: totalsByDate.get(ymd) ?? 0 });
  }
  const weekTotal = week.reduce((s, d) => s + d.value, 0);

  const recent = await listRecentTransactions(supabase, 4);
  const daysLeft = daysLeftInMonth();

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
      <div className="flex flex-wrap items-center gap-3 border-b-2 border-divider pb-4">
        <h1 className="mr-auto text-xl md:text-2xl">Tổng quan {periodLabel()}</h1>
        {streak > 0 && (
          <Link href="/achievements" className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--color-accent-700)" }}>
            <Icon name="flame" className="h-4 w-4" />
            {streak} tháng
          </Link>
        )}
        <Link href="/transactions/new" className="btn btn-primary hidden md:inline-flex">
          Nhập giao dịch
        </Link>
      </div>

      {jars.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Icon name="wallet" className="h-8 w-8 text-neutral-500" />
          <p className="text-sm text-neutral-700">Chưa có hũ ngân sách nào. Tạo hũ đầu tiên để bắt đầu theo dõi.</p>
          <Link href="/jars/new" className="btn btn-primary">
            Tạo hũ mới
          </Link>
        </div>
      ) : (
        <>
          <div className="border-b-2 border-divider pb-4">
            <div>
              <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Còn lại</div>
              <div className="mt-1.5 font-heading text-4xl font-extrabold tabular-nums md:text-[40px]">{formatVND(remaining)}</div>
              <div className="mt-1 text-xs text-neutral-700">
                VND · ngân sách {formatVND(budgetSum)} chia vào {displayJars.length} hũ · còn {daysLeft} ngày
              </div>
            </div>
            <div className="mt-4">
              <BudgetSplitChart jars={displayJars} budgetSum={budgetSum} />
            </div>
          </div>

          {alert && (
            <Banner icon="triangle-alert" tone="accent">
              <span className="font-semibold">{alert}</span>
            </Banner>
          )}

          {pendingLeftovers.length > 0 && <LeftoverBanner items={pendingLeftovers} monthLabel={previousMonthLabel()} />}

          <div>
            <div className="mb-2 text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Tình trạng các hũ</div>
            <div className="grid grid-cols-2 gap-px border border-divider bg-divider sm:grid-cols-3">
              {displayJars.map((jar, i) => {
                const s = jarStats(jar, formatVND);
                const isLastOdd = i === displayJars.length - 1 && displayJars.length % 2 === 1;
                const isFamilyTile = jar.id === "__family__";
                return (
                  <Link
                    key={jar.id}
                    href={isFamilyTile ? "/household" : `/jars/${jar.id}`}
                    className={`block p-3.5 ${isLastOdd ? "col-span-2 sm:col-span-1" : ""}`}
                    style={{ background: s.tileBg }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon name={jar.icon} className="h-4 w-4" style={{ color: jar.color }} />
                      <span className="text-[12px] font-semibold">{jar.name}</span>
                      {!isFamilyTile && jar.isShared && <Icon name="users" className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-label="Hũ quỹ chung" />}
                    </div>
                    <div className="mt-2 font-heading text-[19px] font-extrabold tabular-nums" style={{ color: s.inkColor }}>
                      {s.over ? "−" : ""}
                      {s.leftAmount}
                    </div>
                    <div className="text-[11px] text-neutral-700 tabular-nums">
                      {s.leftWord}, trên {formatVND(jar.monthlyBudget)}
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

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Giao dịch gần nhất</div>
                <Link href="/transactions" className="text-xs text-accent">
                  Tất cả
                </Link>
              </div>
              <div className="flex flex-col">
                {recent.length === 0 && <p className="py-2.5 text-[13px] text-neutral-700">Chưa có giao dịch nào.</p>}
                {recent.map((t) => (
                  <EditableTransaction key={t.id} transaction={t} jars={jars}>
                    <div className="flex items-center gap-2.5 border-b border-divider py-2.5 text-[13px] last:border-b-0">
                      <span className="flex-1">{t.note || t.jarName}</span>
                      <span className="tabular-nums">{formatVND(t.amount)}</span>
                    </div>
                  </EditableTransaction>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
