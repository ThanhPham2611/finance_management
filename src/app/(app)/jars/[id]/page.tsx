import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { Banner, ProgressBar } from "@/components/ui";
import { EditableTransaction } from "@/components/editable-transaction";
import { formatVND, vnNow } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { jarStats, listJarsWithSpent } from "@/lib/queries/jars";
import { formatDayLabel, listTransactionsForJar } from "@/lib/queries/transactions";
import { getMyHousehold, nameOf } from "@/lib/queries/household";

function daysLeftInMonth(): number {
  const now = vnNow();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(1, lastDay - now.getDate() + 1);
}

export default async function JarDetailPage({ params }: PageProps<"/jars/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jars = await listJarsWithSpent(supabase);
  const jar = jars.find((j) => j.id === id) ?? null;
  if (!jar) notFound();

  const s = jarStats(jar, formatVND);
  const [transactions, household] = await Promise.all([
    listTransactionsForJar(supabase, jar.id),
    jar.isShared ? getMyHousehold(supabase, user.id) : null,
  ]);
  const daysLeft = daysLeftInMonth();
  const dayOfMonth = vnNow().getDate();
  const avgPerDay = dayOfMonth ? Math.round(jar.spent / dayOfMonth) : 0;

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
      <div className="flex items-center gap-3">
        <Link href="/jars" aria-label="Quay lại danh sách hũ">
          <Icon name="arrow-left" className="h-[19px] w-[19px]" />
        </Link>
        <h1 className="mr-auto flex items-center gap-2 text-lg md:text-xl">
          {jar.name}
          {jar.isShared && (
            <span className="flex items-center gap-1 border border-divider px-1.5 py-0.5 text-[10px] font-normal tracking-[0.08em] text-neutral-700 uppercase">
              <Icon name="users" className="h-3 w-3" />
              Quỹ chung
            </span>
          )}
        </h1>
        <Link href={`/jars/${jar.id}/edit`} aria-label="Sửa hũ" className="text-neutral-700 hover:text-accent">
          <Icon name="pencil" className="h-[18px] w-[18px]" />
        </Link>
      </div>

      <div className="flex items-start gap-3.5 border-b-2 border-divider pb-4">
        <div className="grid h-[46px] w-[46px] shrink-0 place-items-center" style={{ background: "color-mix(in srgb, currentColor 12%, transparent)", color: jar.color }}>
          <Icon name={jar.icon} className="h-[22px] w-[22px]" />
        </div>
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Còn được chi</div>
          <div className="mt-1 font-heading text-[38px] leading-none font-extrabold tabular-nums">{formatVND(Math.max(0, s.left))}</div>
          <div className="mt-1 text-xs tabular-nums text-neutral-700">
            VND · khoảng {formatVND(Math.max(0, s.left) / daysLeft)}/ngày trong {daysLeft} ngày còn lại
          </div>
        </div>
      </div>

      <div>
        <ProgressBar pct={s.pct} color={s.barColor} height={10} />
        <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-neutral-700">
          <span>
            Đã chi {formatVND(jar.spent)} · {s.pctLabel}
          </span>
          <span>Ngân sách {formatVND(jar.monthlyBudget)}</span>
        </div>
      </div>

      {(s.over || s.near || s.willExceed) && (
        <Banner icon="info" tone={s.over ? "accent" : "amber"}>
          {s.over
            ? `Đã vượt ngân sách ${formatVND(Math.abs(s.left))}.`
            : s.near
              ? `Đã dùng ${s.pctLabel} khi còn ${daysLeft} ngày.`
              : `Với tốc độ chi hiện tại, hũ này có thể vượt ngân sách khoảng ${formatVND(s.projectedOverAmount)} vào cuối tháng.`}
        </Banner>
      )}

      <div className="grid grid-cols-2 border-b-2 border-divider">
        <div className="border-r border-divider py-3.5 pr-4">
          <div className="text-[10px] tracking-[0.1em] text-neutral-700 uppercase">TB/ngày (tháng này)</div>
          <div className="mt-1.5 font-heading text-[17px] font-extrabold tabular-nums">{formatVND(avgPerDay)}</div>
        </div>
        <div className="py-3.5 pl-4">
          <div className="text-[10px] tracking-[0.1em] text-neutral-700 uppercase">Giao dịch (30 gần nhất)</div>
          <div className="mt-1.5 font-heading text-[17px] font-extrabold tabular-nums">{transactions.length}</div>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Giao dịch trong hũ</div>
        </div>
        <div className="flex flex-col">
          {transactions.length === 0 && <p className="py-3 text-[13px] text-neutral-700">Chưa có giao dịch nào trong hũ này.</p>}
          {transactions.map((t) => (
            <EditableTransaction key={t.id} transaction={t} jars={jars}>
              <div className="flex items-center gap-3 border-t border-divider py-2.5">
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">{t.note || "Không ghi chú"}</div>
                  <div className="text-[11px] text-neutral-700">
                    {formatDayLabel(t.transactionDate)}
                    {household && ` · ${nameOf(household.members, t.userId)}`}
                  </div>
                </div>
                <div className="text-[13px] tabular-nums">{formatVND(t.amount)}</div>
              </div>
            </EditableTransaction>
          ))}
        </div>
      </div>

      <div className="flex gap-2.5 border-t-2 border-divider pt-3">
        <Link href={`/transactions/new?jar=${jar.id}`} className="btn btn-primary flex-1 justify-center">
          Nhập chi
        </Link>
      </div>
    </div>
  );
}
