import Link from "next/link";
import { Icon } from "@/components/icon";
import { ProgressBar, ShareBar } from "@/components/ui";
import { formatVND } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { jarLabel, jarStats, listJarsWithSpent } from "@/lib/queries/jars";

export default async function JarsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayJars = user ? await listJarsWithSpent(supabase) : [];
  // Hu tiet kiem khong tinh vao "Tong ngan sach/tháng" hay "Can chu y" —
  // khong phai tien de chi, va rut/vuot cua no khong phai dang "vuot ngan
  // sach" kieu chi tieu thuong. Danh sach hang ben duoi van hien du.
  const spendableJars = displayJars.filter((j) => !j.isSavings);
  const budgetSum = spendableJars.reduce((s, j) => s + j.monthlyBudget, 0);
  const needsAttention = spendableJars.filter((j) => {
    const s = jarStats(j, formatVND);
    return s.over || s.near || s.willExceed;
  }).length;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="mr-auto"><p className="eyebrow">KẾ HOẠCH THEO MỤC ĐÍCH</p><h1>Hũ ngân sách</h1><p>Mỗi hũ là một lời hứa nhỏ với kế hoạch của bạn.</p></div>
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
          <ShareBar segments={spendableJars.map((j) => ({ hue: j.color, share: budgetSum ? (j.monthlyBudget / budgetSum) * 100 : 0 }))} />

          <div className="flex gap-2 border-b-2 border-divider pb-4 text-xs">
            <span className="rounded-full border px-3 py-1.5" style={{ borderColor: "var(--color-primary)", background: "var(--color-primary)", color: "var(--color-on-primary)" }}>
              Tất cả {displayJars.length}
            </span>
            <span className="border border-divider px-2.5 py-1.5">Cần chú ý {needsAttention}</span>
          </div>

          <div className="overflow-hidden rounded-card border border-divider bg-surface shadow-sm">
            {displayJars.map((jar) => {
              const s = jarStats(jar, formatVND);
              return (
                <Link
                  key={jar.id}
                  href={`/jars/${jar.id}`}
                    className="flex min-h-20 items-center gap-3 border-b border-divider px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-subtle"
                >
                  <div
                    className="grid shrink-0 place-items-center rounded-[14px]"
                    style={{ width: 34, height: 34, background: s.over ? "var(--color-accent-200)" : "var(--color-neutral-200)", color: jar.color }}
                  >
                    <Icon name={jar.icon} className="h-[17px] w-[17px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{jarLabel(jar)}</span>
                      {jar.isShared && <Icon name="users" className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-label="Hũ quỹ chung" />}
                      {jar.isSavings && <Icon name="piggy-bank" className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-label="Hũ tiết kiệm" />}
                      <span className="ml-auto shrink-0 text-[13px] tabular-nums" style={{ color: s.inkColor }}>
                        {jar.isSavings && !s.over ? `đã tiết kiệm ${s.leftAmount}` : `${s.leftWord} ${s.leftAmount}`}
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
