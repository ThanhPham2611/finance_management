"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { EditableTransaction } from "@/components/editable-transaction";
import { EmptyState } from "@/components/primitives";
import { Segmented } from "@/components/segmented";
import { SpendingCalendar, type DaySpend } from "@/components/spending-calendar";
import { formatVND, vnToday } from "@/lib/format";
import { nameOf, type HouseholdMember } from "@/lib/queries/household";
import { jarLabel, type RealJar } from "@/lib/queries/jars";
import { formatDayLabel, groupTransactionsByDay, type MonthWindow, type RealTransactionWithJar } from "@/lib/queries/transactions";

type ViewMode = "list" | "calendar";
type TypeFilter = "all" | "expense" | "deposit";
type ScopeFilter = "all" | "personal" | "family";

const VIEWS = [
  { id: "list", label: "Danh sách", icon: "list" },
  { id: "calendar", label: "Lịch", icon: "calendar-days" },
] as const;

const TYPES: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "expense", label: "Chi tiêu" },
  { id: "deposit", label: "Thu" },
];

function spentOf(rows: RealTransactionWithJar[]) {
  return rows.filter((t) => t.type !== "deposit");
}

export function TransactionsClient({
  transactions,
  jars,
  members,
  month,
  userId,
}: {
  transactions: RealTransactionWithJar[];
  jars: RealJar[];
  members: HouseholdMember[];
  month: MonthWindow;
  userId: string;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [jarId, setJarId] = useState("all");
  const [scope, setScope] = useState<ScopeFilter>("all");
  const [view, setView] = useState<ViewMode>("list");
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  const sharedJarIds = useMemo(() => new Set(jars.filter((j) => j.isShared).map((j) => j.id)), [jars]);
  const q = query.trim().toLowerCase();
  const filtering = q !== "" || type !== "all" || jarId !== "all" || scope !== "all";

  const matched = useMemo(() => {
    return transactions.filter((t) => {
      if (type !== "all" && t.type !== type) return false;
      if (jarId !== "all" && t.jarId !== jarId) return false;
      if (!q) return true;
      return `${t.note ?? ""} ${t.jarName}`.toLowerCase().includes(q);
    });
  }, [transactions, type, jarId, q]);

  const filtered = useMemo(() => {
    if (scope === "all") return matched;
    return matched.filter((t) => (scope === "family") === sharedJarIds.has(t.jarId));
  }, [matched, scope, sharedJarIds]);

  const spend = spentOf(filtered);
  const totalSpent = spend.reduce((sum, t) => sum + t.amount, 0);
  const matchedSpend = spentOf(matched);
  const familySpend = matchedSpend.filter((t) => sharedJarIds.has(t.jarId));
  const familySpent = familySpend.reduce((sum, t) => sum + t.amount, 0);
  const personalSpend = matchedSpend.filter((t) => !sharedJarIds.has(t.jarId));
  const days = groupTransactionsByDay(filtered);
  const spendByDay = new Map<string, DaySpend>();
  for (const t of spend) {
    const day = spendByDay.get(t.transactionDate) ?? { total: 0, count: 0 };
    spendByDay.set(t.transactionDate, { total: day.total + t.amount, count: day.count + 1 });
  }
  // Ngày đang chọn phải thuộc tháng đang xem; mặc định là ngày gần nhất có giao dịch.
  const selectedDate = pickedDate?.startsWith(month.ym) ? pickedDate : (days[0]?.date ?? null);
  const selectedItems = filtered.filter((t) => t.transactionDate === selectedDate);
  const selectedSpent = selectedDate ? (spendByDay.get(selectedDate)?.total ?? 0) : 0;

  const renderRow = (t: RealTransactionWithJar) => (
    <TransactionRow key={t.id} t={t} jars={jars} members={members} sharedJarIds={sharedJarIds} canDelete={t.userId === userId} />
  );

  function clearFilters() {
    setQuery("");
    setType("all");
    setJarId("all");
    setScope("all");
  }

  function toggleScope(next: Exclude<ScopeFilter, "all">) {
    setScope((current) => (current === next ? "all" : next));
  }

  return (
    <div className="page-stack">
      <div className="page-header items-center gap-2">
        <Link href={`/transactions?month=${month.prev}`} className="btn btn-secondary px-2" aria-label="Tháng trước">
          <Icon name="chevron-left" className="h-4 w-4" />
        </Link>
        <h1 className="min-w-0 text-2xl md:text-[2.5rem]">{month.label}</h1>
        {month.next ? (
          <Link href={`/transactions?month=${month.next}`} className="btn btn-secondary px-2" aria-label="Tháng sau">
            <Icon name="chevron-right" className="h-4 w-4" />
          </Link>
        ) : (
          <button type="button" className="btn btn-secondary px-2" disabled aria-label="Tháng sau">
            <Icon name="chevron-right" className="h-4 w-4" />
          </button>
        )}
        {/* Mobile đã có nút "+" nổi ở thanh dưới nên bỏ nút này để tiêu đề tháng vừa 1 hàng. */}
        <Link href="/transactions/new" className="btn btn-primary ml-auto hidden md:inline-flex">
          Nhập giao dịch
        </Link>
      </div>

      <section aria-label="Tổng chi trong tháng" className="rounded-card border border-divider bg-[#E5EEE9] p-5 shadow-sm md:p-6">
        <div className="eyebrow uppercase">{month.isCurrent ? "Đã chi tháng này" : `Đã chi tháng ${month.month}`}</div>
        <div className="mt-1.5 font-heading text-4xl font-extrabold tabular-nums md:text-[40px]">{formatVND(totalSpent)}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-neutral-700">
          {filtering ? (
            <>
              <span>
                {filtered.length} / {transactions.length} giao dịch
              </span>
              {filtered.length > 0 && (
                <button type="button" onClick={clearFilters} className="btn btn-ghost px-1 py-0 text-xs">
                  Xoá lọc
                </button>
              )}
            </>
          ) : (
            <span>
              {transactions.length} giao dịch
              {transactions.length > 0 ? ` · TB ${formatVND(totalSpent / transactions.length)}/giao dịch` : ""}
            </span>
          )}
        </div>
        {sharedJarIds.size > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ScopeCard
              label="Cá nhân"
              amount={matchedSpend.reduce((sum, t) => sum + t.amount, 0) - familySpent}
              count={personalSpend.length}
              pressed={scope === "personal"}
              onClick={() => toggleScope("personal")}
            />
            <ScopeCard
              label="Gia đình"
              amount={familySpent}
              count={familySpend.length}
              pressed={scope === "family"}
              onClick={() => toggleScope("family")}
            />
          </div>
        )}
      </section>

      {/* Thanh công cụ tự xuống hàng theo bề rộng (không cần breakpoint): rộng thì 1 hàng, điện thoại thì tìm kiếm / hũ / loại + kiểu xem. */}
      <div className="flex flex-wrap gap-2">
        <label className="relative block min-w-0 flex-[1_1_16rem]">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-600" />
          <input className="input pl-9" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm ghi chú hoặc tên hũ" aria-label="Tìm giao dịch" />
        </label>
        {/* Đang lọc theo hũ thì ô chọn đổi sang nền xanh để nhìn là biết bộ lọc đang bật. */}
        <select
          className={`input min-w-0 flex-[1_1_13rem] lg:flex-[0_1_13rem] ${jarId !== "all" ? "border-primary bg-[#E5EEE9] font-semibold" : ""}`}
          aria-label="Lọc theo hũ"
          value={jarId}
          onChange={(e) => setJarId(e.target.value)}
        >
          <option value="all">Tất cả hũ</option>
          {jars.map((j) => (
            <option key={j.id} value={j.id}>
              {jarLabel(j)}
            </option>
          ))}
        </select>
        <Segmented label="Loại giao dịch" options={TYPES} value={type} onChange={setType} className="flex-[1_1_14rem] lg:flex-[0_0_auto]" />
        <Segmented label="Kiểu xem" options={VIEWS} value={view} onChange={setView} iconOnly className="w-24 flex-none" />
      </div>

      {view === "calendar" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
          <SpendingCalendar
            ym={month.ym}
            spendByDay={spendByDay}
            selected={selectedDate}
            today={month.isCurrent ? vnToday() : null}
            onSelect={setPickedDate}
          />
          <section aria-label="Giao dịch trong ngày">
            {selectedDate ? (
              <DayCard title={formatDayLabel(selectedDate)} total={selectedSpent} suffix=" ₫">
                {selectedItems.length === 0 ? <p className="py-8 text-center text-sm text-neutral-700">Chưa có giao dịch nào trong ngày này.</p> : selectedItems.map(renderRow)}
              </DayCard>
            ) : (
              <p className="py-8 text-center text-sm text-neutral-700">Tháng này chưa có giao dịch. Chọn một ngày để xem.</p>
            )}
          </section>
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="receipt"
          title={month.isCurrent ? "Sổ tháng này còn trống" : `Chưa có giao dịch tháng ${month.month}`}
          message="Ghi khoản chi hoặc tiền nạp đầu tiên của bạn."
          action={
            <Link href="/transactions/new" className="btn btn-primary">
              Nhập giao dịch
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="Không có giao dịch khớp"
          message="Thử đổi từ khoá hoặc bỏ bớt bộ lọc."
          action={
            <button type="button" onClick={clearFilters} className="btn btn-secondary">
              Xoá lọc
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((group) => (
            <DayCard key={group.date} title={group.dayLabel} total={group.total}>
              {group.items.map(renderRow)}
            </DayCard>
          ))}
        </div>
      )}
    </div>
  );
}

/** Một ngày = một thẻ: tiêu đề ngày + tổng, các giao dịch ngăn bằng đường mảnh. */
function DayCard({ title, total, suffix = "", children }: { title: string; total: number; suffix?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card border border-divider bg-surface shadow-sm">
      <div className="flex items-baseline justify-between gap-3 bg-surface-subtle px-4 py-2.5">
        <h2 className="text-[13px] font-bold">{title}</h2>
        <span className="text-xs font-semibold tabular-nums text-neutral-700">
          {formatVND(total)}
          {suffix}
        </span>
      </div>
      <div className="divide-y divide-divider">{children}</div>
    </div>
  );
}

function ScopeCard({ label, amount, count, pressed, onClick }: { label: string; amount: number; count: number; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`rounded-control border p-3 text-left transition-colors ${pressed ? "border-primary bg-primary text-on-primary" : "border-divider bg-surface hover:border-neutral-500"}`}
    >
      <div className={`text-[10px] tracking-[0.1em] uppercase ${pressed ? "opacity-80" : "text-neutral-700"}`}>{label}</div>
      <div className="mt-1 font-heading text-lg font-extrabold tabular-nums">{formatVND(amount)}</div>
      <div className={`text-[11px] ${pressed ? "opacity-80" : "text-neutral-700"}`}>{count} giao dịch</div>
    </button>
  );
}

function TransactionRow({
  t,
  jars,
  members,
  sharedJarIds,
  canDelete,
}: {
  t: RealTransactionWithJar;
  jars: RealJar[];
  members: HouseholdMember[];
  sharedJarIds: Set<string>;
  canDelete: boolean;
}) {
  const shared = sharedJarIds.has(t.jarId);
  return (
    <EditableTransaction transaction={t} jars={jars} canDelete={canDelete}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-control" style={{ background: `color-mix(in srgb, ${t.jarColor} 14%, transparent)`, color: t.jarColor }}>
          <Icon name={t.jarIcon} className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-[13px] ${t.note ? "font-semibold" : "text-neutral-600"}`}>{t.note || (t.type === "deposit" ? "Thu" : "Không ghi chú")}</div>
          <div className="text-[11px] text-neutral-700">
            {shared ? jarLabel({ name: t.jarName, isShared: true, isSavings: false }) : t.jarName}
            {members.length > 0 && shared && ` · ${nameOf(members, t.userId)}`}
          </div>
        </div>
        <div className="text-[13px] font-semibold tabular-nums" style={t.type === "deposit" ? { color: "var(--color-green-ink)" } : undefined}>
          {t.type === "deposit" ? "+" : ""}
          {formatVND(t.amount)}
        </div>
        <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-neutral-400" />
      </div>
    </EditableTransaction>
  );
}
