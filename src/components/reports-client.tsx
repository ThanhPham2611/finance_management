"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Icon } from "@/components/icon";
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

export function ReportsClient({
  allTransactions,
  jars,
  myUserId,
}: {
  allTransactions: RealTransactionWithJar[];
  jars: RealJar[];
  myUserId: string;
}) {
  const [rangeId, setRangeId] = useState<RangeId>("month");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("time");
  const [scope, setScope] = useState<Scope>("all");

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
        <button type="button" onClick={() => downloadCsv(scopedTransactions)} disabled={scopedTransactions.length === 0} className="btn btn-secondary">
          <Icon name="download" className="h-[15px] w-[15px]" />
          Xuất CSV
        </button>
      </div>

      {hasFamilyJars && (
        <div className="flex gap-px overflow-hidden rounded-control border border-divider bg-divider">
          {SCOPES.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => setScope(sc.id)}
              className="flex min-h-11 flex-1 items-center justify-center text-sm"
              style={{ background: sc.id === scope ? "var(--color-primary)" : "var(--color-bg)", color: sc.id === scope ? "var(--color-on-primary)" : "var(--color-text)" }}
            >
              {sc.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-px overflow-hidden rounded-control border border-divider bg-divider">
        {ranges.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRangeId(r.id)}
            className="flex min-h-11 flex-1 items-center justify-center text-sm"
            style={{ background: r.id === rangeId ? "var(--color-primary)" : "var(--color-bg)", color: r.id === rangeId ? "var(--color-on-primary)" : "var(--color-text)" }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Đã chi {range.note}</div>
          <div className="mt-1.5 font-heading text-4xl font-extrabold tabular-nums">{formatVND(range.total)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">So kỳ trước</div>
          <div className="mt-1.5 font-heading text-lg font-extrabold tabular-nums" style={{ color: delta > 0 ? "var(--color-accent-700)" : "var(--color-green-ink)" }}>
            {delta > 0 ? "+" : "−"}
            {formatVND(Math.abs(delta))}
          </div>
        </div>
      </div>

      <div className="flex gap-px overflow-hidden rounded-control border border-divider bg-divider">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className="flex min-h-11 flex-1 items-center justify-center text-sm"
            style={{ background: t.id === tab ? "var(--color-primary)" : "var(--color-bg)", color: t.id === tab ? "var(--color-on-primary)" : "var(--color-text)" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "time" ? (
        <div className="border-t-2 border-divider pt-4">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">{range.chartTitle}</div>
            <div className="text-[11px] tabular-nums text-neutral-700">TB {formatVND(range.total / nonZeroBucketCount)}</div>
          </div>
          <div className="mt-3.5 h-[132px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={range.labels.map((label, i) => ({ label, value: range.values[i] }))} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
                <Tooltip formatter={(v) => [`${formatVND(Number(v))}đ`, ""]} labelFormatter={() => ""} contentStyle={tooltipStyle} cursor={{ fill: "var(--color-neutral-300)" }} />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {range.values.map((_, i) => (
                    <Cell key={i} fill={i === range.activeIdx ? "var(--color-accent)" : "var(--color-neutral-400)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="border-t-2 border-divider pt-4">
          {jarRows.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-neutral-700">Chưa có hũ nào để thống kê.</p>
          ) : (
            <>
              <div className="flex h-3.5 gap-px">
                {jarRows.map(({ jar, spent }) => (
                  <div key={jar.id} style={{ width: `${spentTotal ? (spent / spentTotal) * 100 : 0}%`, background: jar.color }} />
                ))}
              </div>
              <div className="mt-2 text-[11px] text-neutral-700">Tỷ trọng chi theo hũ trong tháng này</div>
              <div className="mt-2">
                {jarRows
                  .slice()
                  .sort((a, b) => b.spent - a.spent)
                  .map(({ jar, spent, prevSpent, count }) => {
                    const d = spent - prevSpent;
                    return (
                      <Link key={jar.id} href={`/jars/${jar.id}`} className="flex items-center gap-3 border-t border-divider py-2.5">
                        <div className="h-[30px] w-2 shrink-0" style={{ background: jar.color }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold">{jarLabel(jar)}</div>
                          <div className="text-[11px] tabular-nums text-neutral-700">
                            {count} giao dịch · {spentTotal ? ((spent / spentTotal) * 100).toFixed(1) : "0"}% tổng chi
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[13px] font-semibold tabular-nums">{formatVND(spent)}</div>
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

      <div className="border-t-2 border-divider pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Giao dịch gần đây</div>
          <Link href="/transactions" className="text-xs text-accent">
            Xem tất cả
          </Link>
        </div>
        {recentTransactions.length === 0 && <p className="py-2.5 text-[13px] text-neutral-700">Chưa có giao dịch nào.</p>}
        {recentTransactions.map((t) => (
          <EditableTransaction key={t.id} transaction={t} jars={jars} canDelete={t.userId === myUserId}>
            <div className="flex items-center gap-3 border-t border-divider py-2 text-[13px]">
              <span className="flex-1">{t.note || t.jarName}</span>
              <span className="tabular-nums">{formatVND(t.amount)}</span>
            </div>
          </EditableTransaction>
        ))}
      </div>
    </div>
  );
}
