"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { MoneyInput } from "@/components/ui";
import { formatVND } from "@/lib/format";

const QUICK_CHIPS = [500_000, 1_000_000, 1_600_000];

type Row = { id: string; label: string; amount: number };

function newRow(amount = 0): Row {
  return { id: crypto.randomUUID(), label: "", amount };
}

/**
 * Budget amount input with an optional "add it up from smaller items" mode —
 * for someone who doesn't know the round number yet but can list what it's
 * made of (gạo 500k, thịt cá 300k, ...). The line items themselves are never
 * saved; only their live sum is reported through `onChange`.
 */
export function BudgetField({ value, onChange }: { value: number; onChange: (amount: number) => void }) {
  const [mode, setMode] = useState<"single" | "breakdown">("single");
  const [rows, setRows] = useState<Row[]>([newRow()]);

  function toBreakdown() {
    setRows([newRow(value)]);
    setMode("breakdown");
  }

  function toSingle() {
    onChange(rows.reduce((sum, r) => sum + r.amount, 0));
    setMode("single");
  }

  function updateRow(id: string, patch: Partial<Row>) {
    const next = rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
    setRows(next);
    onChange(next.reduce((sum, r) => sum + r.amount, 0));
  }

  function removeRow(id: string) {
    const next = rows.filter((r) => r.id !== id);
    const safe = next.length ? next : [newRow()];
    setRows(safe);
    onChange(safe.reduce((sum, r) => sum + r.amount, 0));
  }

  if (mode === "breakdown") {
    const sum = rows.reduce((s, r) => s + r.amount, 0);
    return (
      <div>
        <div className="flex items-baseline gap-2">
          <div className="font-heading text-[34px] font-extrabold tabular-nums">{formatVND(sum)}</div>
          <div className="text-[13px] text-neutral-700">VND · tổng {rows.length} khoản</div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-2">
              <input
                className="input flex-1"
                placeholder="Khoản, ví dụ: Gạo"
                value={row.label}
                onChange={(e) => updateRow(row.id, { label: e.target.value })}
              />
              <MoneyInput value={row.amount} onChange={(amount) => updateRow(row.id, { amount })} className="input w-36" aria-label="Số tiền khoản này" />
              <button type="button" onClick={() => removeRow(row.id)} aria-label="Xoá khoản" className="btn btn-secondary h-11 w-11 shrink-0 p-0">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4">
          <button type="button" onClick={() => setRows((prev) => [...prev, newRow()])} className="btn btn-secondary">
            <Icon name="plus" className="h-4 w-4" />
            Thêm khoản
          </button>
          <button type="button" onClick={toSingle} className="text-xs text-accent hover:underline">
            Nhập một số duy nhất
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <div className="font-heading text-[34px] font-extrabold tabular-nums">{formatVND(value)}</div>
        <div className="text-[13px] text-neutral-700">VND</div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {QUICK_CHIPS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onChange(amount)}
            className="h-11 border px-3 text-sm"
            style={value === amount ? { borderColor: "var(--color-accent)", color: "var(--color-accent)" } : { borderColor: "var(--color-divider)" }}
          >
            {formatVND(amount)}
          </button>
        ))}
        <MoneyInput value={value} onChange={onChange} className="input w-36" aria-label="Nhập số tiền khác" />
      </div>
      <button type="button" onClick={toBreakdown} className="mt-2 text-xs text-accent hover:underline">
        Chưa biết rõ tổng? Cộng từ từng khoản nhỏ
      </button>
    </div>
  );
}
