"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoneyInput } from "@/components/ui";
import type { RealJar } from "@/lib/queries/jars";
import { updateTransaction } from "@/app/(app)/transactions/actions";

type EditableFields = { id: string; jarId: string; amount: number; note: string | null; transactionDate: string };

/** Click-to-edit wrapper: renders `children` as the normal read-only row, and
 * swaps in an inline edit form on click. Used everywhere a transaction is listed. */
export function EditableTransaction({ transaction, jars, children }: { transaction: EditableFields; jars: RealJar[]; children: React.ReactNode }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [jarId, setJarId] = useState(transaction.jarId);
  const [amount, setAmount] = useState(transaction.amount);
  const [note, setNote] = useState(transaction.note ?? "");
  const [date, setDate] = useState(transaction.transactionDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="block w-full text-left transition-colors hover:bg-surface"
        aria-label="Sửa giao dịch"
      >
        {children}
      </button>
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateTransaction({ id: transaction.id, jarId, amount, note, transactionDate: date });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    setEditing(false);
  }

  return (
    <div className="flex flex-col gap-2 border-t border-divider bg-surface px-3 py-3">
      <div className="flex gap-2">
        <select className="input flex-1" value={jarId} onChange={(e) => setJarId(e.target.value)}>
          {jars.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}
            </option>
          ))}
        </select>
        <input type="date" className="input" style={{ width: 150 }} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <MoneyInput value={amount} onChange={setAmount} className="input flex-1" aria-label="Số tiền" />
        <input className="input flex-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú" />
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--color-accent-700)" }}>
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
          Huỷ
        </button>
        <button type="button" disabled={saving || !amount} onClick={handleSave} className="btn btn-primary flex-1 justify-center">
          {saving ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
    </div>
  );
}
