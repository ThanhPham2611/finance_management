import Link from "next/link";
import { Icon } from "@/components/icon";
import { ProgressBar, ShareBar } from "@/components/ui";
import { formatVND } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { aggregateFamilyJar, jarStats, listJarsWithSpent } from "@/lib/queries/jars";

export default async function JarsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allJars = user ? await listJarsWithSpent(supabase) : [];
  const personalJars = allJars.filter((j) => !j.isShared);
  const familyJars = allJars.filter((j) => j.isShared);

  const displayJars = familyJars.length > 0 ? [...personalJars, aggregateFamilyJar(familyJars)] : personalJars;
  const budgetSum = displayJars.reduce((s, j) => s + j.monthlyBudget, 0);
  const needsAttention = displayJars.filter((j) => {
    const s = jarStats(j, formatVND);
    return s.over || s.near || s.willExceed;
  }).length;

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
      <div className="flex items-center gap-3 border-b-2 border-divider pb-4">
        <h1 className="mr-auto text-xl md:text-2xl">Hũ ngân sách</h1>
        <Link href="/household" aria-label="Gia đình" className="text-neutral-700 hover:text-accent md:hidden">
          <Icon name="users" className="h-5 w-5" />
        </Link>
        <Link href="/jars/new" className="btn btn-primary">
          Tạo hũ mới
        </Link>
      </div>

      {displayJars.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Icon name="wallet" className="h-8 w-8 text-neutral-500" />
          <p className="text-sm text-neutral-700">Chưa có hũ ngân sách nào. Tạo hũ đầu tiên để bắt đầu chia tiền.</p>
          <Link href="/jars/new" className="btn btn-primary">
            Tạo hũ mới
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Tổng ngân sách/tháng</div>
              <div className="mt-1.5 font-heading text-[30px] font-extrabold tabular-nums">{formatVND(budgetSum)}</div>
            </div>
          </div>
          <ShareBar segments={displayJars.map((j) => ({ hue: j.color, share: budgetSum ? (j.monthlyBudget / budgetSum) * 100 : 0 }))} />

          <div className="flex gap-2 border-b-2 border-divider pb-4 text-xs">
            <span className="border px-2.5 py-1.5" style={{ borderColor: "var(--color-accent)", background: "var(--color-accent)", color: "var(--color-bg)" }}>
              Tất cả {displayJars.length}
            </span>
            <span className="border border-divider px-2.5 py-1.5">Cần chú ý {needsAttention}</span>
          </div>

          <div className="border border-divider">
            {displayJars.map((jar) => {
              const s = jarStats(jar, formatVND);
              const isFamilyRow = jar.id === "__family__";
              return (
                <Link
                  key={jar.id}
                  href={isFamilyRow ? "/household" : `/jars/${jar.id}`}
                  className="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0"
                  style={{ background: s.rowBg }}
                >
                  <div
                    className="grid shrink-0 place-items-center"
                    style={{ width: 34, height: 34, background: s.over ? "var(--color-accent-200)" : "var(--color-neutral-200)", color: jar.color }}
                  >
                    <Icon name={jar.icon} className="h-[17px] w-[17px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{jar.name}</span>
                      {!isFamilyRow && jar.isShared && <Icon name="users" className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-label="Hũ quỹ chung" />}
                      <span className="ml-auto shrink-0 text-[13px] tabular-nums" style={{ color: s.inkColor }}>
                        {s.leftWord} {s.leftAmount}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2.5">
                      <ProgressBar pct={s.pct} color={s.barColor} className="flex-1" />
                      <span className="text-[11px] tabular-nums text-neutral-700">{s.pctLabel}</span>
                    </div>
                  </div>
                  <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-neutral-500" />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
