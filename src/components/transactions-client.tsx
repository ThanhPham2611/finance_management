"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { EditableTransaction } from "@/components/editable-transaction";
import { formatVND } from "@/lib/format";
import { nameOf, type HouseholdMember } from "@/lib/queries/household";
import { jarLabel, type RealJar } from "@/lib/queries/jars";
import { groupTransactionsByDay, type MonthWindow, type RealTransactionWithJar } from "@/lib/queries/transactions";

type TypeFilter = "all" | "expense" | "deposit";
type ScopeFilter = "all" | "personal" | "family";

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
    <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-divider pb-4">
        <Link href={`/transactions?month=${month.prev}`} className="btn btn-secondary px-2" aria-label="Tháng trước">
          <Icon name="chevron-left" className="h-4 w-4" />
        </Link>
        <h1 className="text-xl md:text-2xl">{month.label}</h1>
        {month.next ? (
          <Link href={`/transactions?month=${month.next}`} className="btn btn-secondary px-2" aria-label="Tháng sau">
            <Icon name="chevron-right" className="h-4 w-4" />
          </Link>
        ) : (
          <button type="button" className="btn btn-secondary px-2" disabled aria-label="Tháng sau">
            <Icon name="chevron-right" className="h-4 w-4" />
          </button>
        )}
        <Link href="/transactions/new" className="btn btn-primary ml-auto">
          Nhập giao dịch
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        <label className="relative block">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-600" />
          <input
            className="input pl-9"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm ghi chú hoặc tên hũ"
            aria-label="Tìm giao dịch"
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 gap-px border border-divider bg-divider">
            {TYPES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id)}
                aria-pressed={item.id === type}
                className="flex h-11 flex-1 items-center justify-center text-sm"
                style={{
                  background: item.id === type ? "var(--color-accent)" : "var(--color-bg)",
                  color: item.id === type ? "var(--color-bg)" : "var(--color-text)",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <select className="input sm:w-52" aria-label="Lọc theo hũ" value={jarId} onChange={(e) => setJarId(e.target.value)}>
            <option value="all">Tất cả hũ</option>
            {jars.map((j) => (
              <option key={j.id} value={j.id}>
                {jarLabel(j)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-b-2 border-divider pb-4">
        <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">{month.isCurrent ? "Đã chi tháng này" : `Đã chi tháng ${month.month}`}</div>
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
          <div className="mt-3 grid grid-cols-2 gap-px border border-divider bg-divider">
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
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Icon name={transactions.length === 0 ? "receipt" : "search"} className="h-8 w-8 text-neutral-500" />
          {transactions.length === 0 ? (
            <>
              <p className="text-sm text-neutral-700">{month.isCurrent ? "Chưa có giao dịch nào trong tháng này." : `Chưa có giao dịch nào trong tháng ${month.month}.`}</p>
              <Link href="/transactions/new" className="btn btn-primary">
                Nhập giao dịch
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-700">Không có giao dịch khớp.</p>
              <button type="button" onClick={clearFilters} className="btn btn-secondary">
                Xoá lọc
              </button>
            </>
          )}
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
                <EditableTransaction key={t.id} transaction={t} jars={jars} canDelete={t.userId === userId}>
                  <div className="flex items-center gap-3 border-b border-divider px-3 py-3">
                    <div
                      className="grid h-9 w-9 shrink-0 place-items-center"
                      style={{ background: `color-mix(in srgb, ${t.jarColor} 14%, transparent)`, color: t.jarColor }}
                    >
                      <Icon name={t.jarIcon} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-[13px] ${t.note ? "font-semibold" : "text-neutral-600"}`}>
                        {t.note || (t.type === "deposit" ? "Thu" : "Không ghi chú")}
                      </div>
                      <div className="text-[11px] text-neutral-700">
                        {sharedJarIds.has(t.jarId) ? jarLabel({ name: t.jarName, isShared: true, isSavings: false }) : t.jarName}
                        {members.length > 0 && sharedJarIds.has(t.jarId) && ` · ${nameOf(members, t.userId)}`}
                      </div>
                    </div>
                    <div className="text-[13px] font-semibold tabular-nums" style={t.type === "deposit" ? { color: "var(--color-green-ink)" } : undefined}>
                      {t.type === "deposit" ? "+" : ""}
                      {formatVND(t.amount)}
                    </div>
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

function ScopeCard({ label, amount, count, pressed, onClick }: { label: string; amount: number; count: number; pressed: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={pressed} className="p-3 text-left" style={{ background: pressed ? "var(--color-accent)" : "var(--color-bg)", color: pressed ? "var(--color-bg)" : undefined }}>
      <div className={`text-[10px] tracking-[0.1em] uppercase ${pressed ? "opacity-80" : "text-neutral-700"}`}>{label}</div>
      <div className="mt-1 font-heading text-lg font-extrabold tabular-nums">{formatVND(amount)}</div>
      <div className={`text-[11px] ${pressed ? "opacity-80" : "text-neutral-700"}`}>{count} giao dịch</div>
    </button>
  );
}
