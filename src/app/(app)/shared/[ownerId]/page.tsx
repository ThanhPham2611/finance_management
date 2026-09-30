import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { ProgressBar } from "@/components/ui";
import { formatVND } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { currentMonthStart, jarStats } from "@/lib/queries/jars";
import { groupTransactionsByDay } from "@/lib/queries/transactions";
import { getAcceptedShare, getOwnerName, listOwnerJarsWithSpent, listOwnerTransactionsSince } from "@/lib/queries/shares";

export default async function SharedOwnerPage({ params }: PageProps<"/shared/[ownerId]">) {
  const { ownerId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isShared = await getAcceptedShare(supabase, ownerId, user.id);
  if (!isShared) notFound();

  const [ownerName, jars, transactions] = await Promise.all([
    getOwnerName(supabase, ownerId),
    listOwnerJarsWithSpent(supabase, ownerId),
    listOwnerTransactionsSince(supabase, ownerId, currentMonthStart()),
  ]);

  const days = groupTransactionsByDay(transactions);
  const totalBudget = jars.reduce((s, j) => s + j.monthlyBudget, 0);
  const totalSpent = jars.reduce((s, j) => s + j.spent, 0);

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
      <div className="flex items-center gap-3 border-b-2 border-divider pb-4">
        <Link href="/shared" aria-label="Quay lại">
          <Icon name="arrow-left" className="h-[19px] w-[19px]" />
        </Link>
        <h1 className="mr-auto text-xl md:text-2xl">Chi tiêu của {ownerName}</h1>
      </div>

      <div className="text-[13px] text-neutral-700">
        Đã chi {formatVND(totalSpent)} / {formatVND(totalBudget)} tháng này · chỉ xem, không thể chỉnh sửa
      </div>

      <div className="flex flex-col gap-3">
        {jars.length === 0 && <p className="text-[13px] text-neutral-700">{ownerName} chưa có hũ nào.</p>}
        {jars.map((jar) => {
          const s = jarStats(jar, formatVND);
          return (
            <div key={jar.id} className="border border-divider p-3">
              <div className="flex items-center gap-2.5">
                <Icon name={jar.icon} className="h-4 w-4" style={{ color: jar.color }} />
                <span className="flex-1 text-sm font-semibold">{jar.name}</span>
                <span className="text-[13px] tabular-nums">
                  {formatVND(jar.spent)} / {formatVND(jar.monthlyBudget)}
                </span>
              </div>
              <ProgressBar pct={s.pct} color={s.barColor} className="mt-2" />
            </div>
          );
        })}
      </div>

      <div>
        <div className="mb-2 text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Giao dịch gần đây</div>
        {days.length === 0 && <p className="py-3 text-[13px] text-neutral-700">Chưa có giao dịch nào.</p>}
        {days.map((day) => (
          <div key={day.date}>
            <div className="mt-3 text-[11px] font-semibold text-neutral-700">{day.dayLabel}</div>
            {day.items.map((t) => (
              <div key={t.id} className="flex items-center gap-3 border-t border-divider py-2.5">
                <Icon name={t.jarIcon} className="h-4 w-4" style={{ color: t.jarColor }} />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">{t.note || "Không ghi chú"}</div>
                  <div className="text-[11px] text-neutral-700">{t.jarName}</div>
                </div>
                <div className="text-[13px] tabular-nums">{formatVND(t.amount)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
