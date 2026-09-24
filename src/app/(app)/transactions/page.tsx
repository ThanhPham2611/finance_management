import Link from "next/link";
import { Icon } from "@/components/icon";
import { EditableTransaction } from "@/components/editable-transaction";
import { formatVND, vnNow } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { currentMonthStart, listJarsWithSpent } from "@/lib/queries/jars";
import { groupTransactionsByDay, listTransactionsSince } from "@/lib/queries/transactions";
import { getMyHousehold, nameOf } from "@/lib/queries/household";

function monthLabel(): string {
  const now = vnNow();
  return `Giao dịch tháng ${now.getMonth() + 1}`;
}

export default async function TransactionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [transactions, jars, household] = user
    ? await Promise.all([listTransactionsSince(supabase, currentMonthStart()), listJarsWithSpent(supabase), getMyHousehold(supabase, user.id)])
    : [[], [], null];
  const sharedJarIds = new Set(jars.filter((j) => j.isShared).map((j) => j.id));
  const days = groupTransactionsByDay(transactions);
  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
      <div className="flex items-center gap-3 border-b-2 border-divider pb-4">
        <h1 className="mr-auto text-xl md:text-2xl">{monthLabel()}</h1>
        <Link href="/transactions/new" className="btn btn-primary">
          Nhập giao dịch
        </Link>
      </div>

      <div className="border-b-2 border-divider pb-4">
        <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Đã chi tháng này</div>
        <div className="mt-1.5 font-heading text-4xl font-extrabold tabular-nums md:text-[40px]">{formatVND(totalSpent)}</div>
        <div className="mt-1 text-xs text-neutral-700">
          {transactions.length} giao dịch{transactions.length > 0 ? ` · TB ${formatVND(totalSpent / transactions.length)}/giao dịch` : ""}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Icon name="receipt" className="h-8 w-8 text-neutral-500" />
          <p className="text-sm text-neutral-700">Chưa có giao dịch nào trong tháng này.</p>
          <Link href="/transactions/new" className="btn btn-primary">
            Nhập giao dịch
          </Link>
        </div>
      ) : (
        <div className="flex flex-col">
          {days.map((group) => (
            <div key={group.date}>
              <div className="flex items-baseline justify-between bg-surface px-3 py-2">
                <span className="text-[11px] font-semibold text-neutral-800">{group.dayLabel}</span>
                <span className="text-[11px] tabular-nums text-neutral-600">{formatVND(group.total)}</span>
              </div>
              {group.items.map((t) => (
                <EditableTransaction key={t.id} transaction={t} jars={jars}>
                  <div className="flex items-center gap-3 border-b border-divider px-3 py-3">
                    <div
                      className="grid h-9 w-9 shrink-0 place-items-center"
                      style={{ background: `color-mix(in srgb, ${t.jarColor} 14%, transparent)`, color: t.jarColor }}
                    >
                      <Icon name={t.jarIcon} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[13px] ${t.note ? "font-semibold" : "text-neutral-600"}`}>{t.note || "Không ghi chú"}</div>
                      <div className="text-[11px] text-neutral-700">
                        {t.jarName}
                        {household && sharedJarIds.has(t.jarId) && ` · ${nameOf(household.members, t.userId)}`}
                      </div>
                    </div>
                    <div className="text-[13px] font-semibold tabular-nums">{formatVND(t.amount)}</div>
                    <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-neutral-400" />
                  </div>
                </EditableTransaction>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
