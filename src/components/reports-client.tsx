"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { withDistinctJarColors } from "@hu/domain";
import { Icon } from "@/components/icon";
import { Segmented } from "@/components/segmented";
import { EditableTransaction } from "@/components/editable-transaction";
import { formatVND, vnToday } from "@/lib/format";
import { jarLabel, type RealJar } from "@/lib/queries/jars";
import { buildJarSpendRows, buildRanges, type RangeId } from "@/lib/queries/reports";
import type { RealTransactionWithJar } from "@/lib/queries/transactions";

const axisTick = { fontSize: 10, fill: "var(--color-neutral-700)" };
const tooltipStyle = { fontSize: 14, border: "1px solid var(--color-divider)", borderRadius: 10, boxShadow: "var(--shadow-md)" };

const TABS = [
  { id: "time", label: "Theo thời gian" },
  { id: "bucket", label: "Theo hũ" },
] as const;

type Scope = "all" | "personal" | "family";
const SCOPES: { id: Scope; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "personal", label: "Cá nhân" },
  { id: "family", label: "Gia đình" },
];

function downloadCsv(rows: RealTransactionWithJar[]) {
  const header = ["Ngày", "Hũ", "Ghi chú", "Số tiền (VND)"];
  const lines = rows.map((t) => [t.transactionDate, t.jarName, (t.note ?? "").replace(/,/g, " "), String(t.amount)].join(","));
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `giao-dich-${vnToday()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const CARD = "rounded-card border border-divider bg-surface p-4 shadow-sm md:p-5";
const EYEBROW = "text-[11px] font-bold tracking-[0.12em] text-neutral-700 uppercase";

/** Chi tăng = cảnh báo nhẹ (hổ phách), giảm = tốt (xanh); có icon + dấu nên không chỉ dựa vào màu. */
function DeltaChip({ delta }: { delta: number }) {
  const tone = delta > 0 ? { icon: "trending-up", bg: "var(--color-accent-100)", ink: "var(--color-accent-700)" } : delta < 0 ? { icon: "trending-down", bg: "#E4F0EA", ink: "var(--color-green-ink)" } : { icon: "minus", bg: "var(--color-surface)", ink: "var(--color-neutral-700)" };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tabular-nums" style={{ background: tone.bg, color: tone.ink }}>
      <Icon name={tone.icon} className="h-4 w-4" aria-hidden />
      {delta === 0 ? "Không đổi so với kỳ trước" : `${delta > 0 ? "+" : "−"}${formatVND(Math.abs(delta))} so với kỳ trước`}
    </span>
  );
}

export function ReportsClient({
  allTransactions,
  jars: rawJars,
  myUserId,
}: {
  allTransactions: RealTransactionWithJar[];
  jars: RealJar[];
  myUserId: string;
}) {
  const [rangeId, setRangeId] = useState<RangeId>("month");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("time");
  const [scope, setScope] = useState<Scope>("all");

  // Hũ cũ có thể trùng màu — chỉ đổi lúc hiển thị để thanh tỷ trọng tách được từng hũ.
  const jars = useMemo(() => withDistinctJarColors(rawJars), [rawJars]);
  const sharedJarIds = useMemo(() => new Set(jars.filter((j) => j.isShared).map((j) => j.id)), [jars]);
  const hasFamilyJars = sharedJarIds.size > 0;

  // Ca nhan/gia dinh chi phan biet duoc qua hu (jar.isShared) — 1 giao dich
  // thuoc "gia dinh" khi no nam trong 1 hu quy chung, bat ke ai chi.
  const scopedTransactions = useMemo(() => {
    if (scope === "all") return allTransactions;
    return allTransactions.filter((t) => (scope === "family") === sharedJarIds.has(t.jarId));
  }, [allTransactions, scope, sharedJarIds]);
  const scopedJars = useMemo(() => {
    if (scope === "all") return jars;
    return jars.filter((j) => (scope === "family") === j.isShared);
  }, [jars, scope]);

  const ranges = useMemo(() => buildRanges(scopedTransactions), [scopedTransactions]);
  const jarRows = useMemo(() => buildJarSpendRows(scopedJars, scopedTransactions), [scopedJars, scopedTransactions]);
  const recentTransactions = useMemo(() => scopedTransactions.slice(0, 5), [scopedTransactions]);

  const range = ranges.find((r) => r.id === rangeId)!;
  const delta = range.total - range.prev;
  const spentTotal = jarRows.reduce((s, r) => s + r.spent, 0);
  const nonZeroBucketCount = range.values.filter((v) => v > 0).length || 1;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="mr-auto"><p className="eyebrow">NHÌN LẠI ĐỂ ĐI TIẾP</p><h1>Báo cáo</h1><p>Đọc nhịp chi tiêu theo thời gian và từng hũ.</p></div>
        <button type="button" onClick={() => downloadCsv(scopedTransactions)} disabled={scopedTransactions.length === 0} className="btn btn-secondary shrink-0 whitespace-nowrap">
          <Icon name="download" className="h-[15px] w-[15px]" />
          Xuất CSV
        </button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="md:flex-1">
          <Segmented label="Khoảng thời gian báo cáo" options={ranges} value={rangeId} onChange={setRangeId} />
        </div>
        {hasFamilyJars && (
          <div className="md:w-80">
            <Segmented label="Phạm vi báo cáo" options={SCOPES} value={scope} onChange={setScope} />
          </div>
        )}
      </div>

      <section aria-label="Tổng chi kỳ này" className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 rounded-card border border-divider bg-[#E5EEE9] p-5 shadow-sm md:p-6">
        <div>
          <div className="eyebrow uppercase">Đã chi {range.note}</div>
          <div className="mt-1.5 font-heading text-4xl font-extrabold tabular-nums md:text-[40px]">{formatVND(range.total)}</div>
        </div>
        <DeltaChip delta={delta} />
      </section>

      <section className={CARD}>
        <Segmented label="Kiểu báo cáo" options={TABS} value={tab} onChange={setTab} />

        {tab === "time" ? (
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={EYEBROW}>{range.chartTitle}</h2>
              <div className="text-xs tabular-nums text-neutral-700">TB {formatVND(range.total / nonZeroBucketCount)}</div>
            </div>
            <div className="mt-3 h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={range.labels.map((label, i) => ({ label, value: range.values[i] }))} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
                  <Tooltip formatter={(v) => [`${formatVND(Number(v))}đ`, ""]} labelFormatter={() => ""} contentStyle={tooltipStyle} cursor={{ fill: "var(--color-neutral-200)" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {range.values.map((_, i) => (
                      <Cell key={i} fill={i === range.activeIdx ? "var(--color-accent)" : "var(--color-neutral-400)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {jarRows.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-neutral-700">Chưa có hũ nào để thống kê.</p>
            ) : (
              <>
                <h2 className={EYEBROW}>Tỷ trọng chi theo hũ trong tháng này</h2>
                <div className="mt-2 flex h-3 gap-px overflow-hidden rounded-full bg-surface-subtle">
                  {jarRows.map(({ jar, spent }) => (
                    <div key={jar.id} style={{ width: `${spentTotal ? (spent / spentTotal) * 100 : 0}%`, background: jar.color }} />
                  ))}
                </div>
                <div className="mt-2 divide-y divide-divider">
                  {jarRows
                    .slice()
                    .sort((a, b) => b.spent - a.spent)
                    .map(({ jar, spent, prevSpent, count }) => {
                      const d = spent - prevSpent;
                      const pct = spentTotal ? (spent / spentTotal) * 100 : 0;
                      return (
                        <Link key={jar.id} href={`/jars/${jar.id}`} className="flex min-h-16 items-center gap-4 py-2.5 transition-opacity hover:opacity-70">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold">{jarLabel(jar)}</div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-subtle">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(pct > 0 ? 2 : 0, pct))}%`, background: jar.color }} />
                            </div>
                            <div className="mt-1 text-[11px] tabular-nums text-neutral-700">
                              {count} giao dịch · {pct.toFixed(1)}% tổng chi
                            </div>
                          </div>
                          <div className="w-28 shrink-0 text-right">
                            <div className="text-sm font-bold tabular-nums">{formatVND(spent)}</div>
                            <div className="text-[11px] tabular-nums" style={{ color: d > 0 ? "var(--color-accent-700)" : d < 0 ? "var(--color-green-ink)" : "var(--color-neutral-700)" }}>
                              {d === 0 ? "không đổi" : `${d > 0 ? "+" : "−"}${formatVND(Math.abs(d))}`}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <section className={CARD}>
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className={EYEBROW}>Giao dịch gần đây</h2>
          <Link href="/transactions" className="inline-flex min-h-11 items-center text-xs font-semibold text-accent">
            Xem tất cả
          </Link>
        </div>
        {recentTransactions.length === 0 && <p className="py-2.5 text-[13px] text-neutral-700">Chưa có giao dịch nào.</p>}
        <div className="divide-y divide-divider">
          {recentTransactions.map((t) => (
            <EditableTransaction key={t.id} transaction={t} jars={jars} canDelete={t.userId === myUserId}>
              <div className="flex items-center gap-3 py-2.5 text-[13px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.jarColor }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{t.note || t.jarName}</span>
                  {t.note && <span className="block truncate text-[11px] text-neutral-700">{t.jarName}</span>}
                </span>
                <span className="font-semibold tabular-nums">{formatVND(t.amount)}</span>
              </div>
            </EditableTransaction>
          ))}
        </div>
      </section>
    </div>
  );
}
