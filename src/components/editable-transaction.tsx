"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { Banner, MoneyInput } from "@/components/ui";
import { jarLabel, type RealJar } from "@/lib/queries/jars";
import { deleteTransaction, updateTransaction } from "@/app/(app)/transactions/actions";

type EditableFields = { id: string; jarId: string; amount: number; note: string | null; transactionDate: string; type: "expense" | "deposit" };

/** Click-to-edit wrapper: renders `children` as the normal read-only row, and
 * swaps in an inline edit form on click. Used everywhere a transaction is listed.
 * `canDelete` chi bat khi giao dich la cua chinh nguoi dang xem — server action
 * cung tu chan lai lan nua bang user_id, day chi la an nut cho gon giao dien. */
export function EditableTransaction({
  transaction,
  jars,
  canDelete = false,
  children,
}: {
  transaction: EditableFields;
  jars: RealJar[];
  canDelete?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [jarId, setJarId] = useState(transaction.jarId);
  const [amount, setAmount] = useState(transaction.amount);
  const [note, setNote] = useState(transaction.note ?? "");
  const [date, setDate] = useState(transaction.transactionDate);
  const [type, setType] = useState<"expense" | "deposit">(transaction.type);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Canh bao truoc khi luu 1 khoan chi vao hu tiet kiem — cung pattern voi
  // transaction-entry.tsx: click "Luu" lan dau chi bat canh bao, lan 2 moi
  // that su goi action.
  const [confirmSavings, setConfirmSavings] = useState(false);

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
    const targetJar = jars.find((j) => j.id === jarId);
    if (type === "expense" && targetJar?.isSavings && !confirmSavings) {
      setConfirmSavings(true);
      return;
    }
    setSaving(true);
    setError(null);
    const result = await updateTransaction({ id: transaction.id, jarId, amount, note, transactionDate: date, type });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    setEditing(false);
  }

  async function handleDelete() {
    if (!window.confirm("Xoá giao dịch này? Không thể hoàn tác.")) return;
    setDeleting(true);
    setError(null);
    const result = await deleteTransaction({ id: transaction.id, jarId: transaction.jarId });
    setDeleting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 border-t border-divider bg-surface px-3 py-3">
      <div className="flex h-11 gap-px border border-divider bg-divider">
        {(
          [
            ["expense", "Chi"],
            ["deposit", "Thu"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={type === id}
            onClick={() => {
              setType(id);
              setConfirmSavings(false);
            }}
            className="flex flex-1 items-center justify-center text-sm"
            style={{ background: type === id ? "var(--color-accent)" : "var(--color-bg)", color: type === id ? "var(--color-bg)" : "var(--color-text)" }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          className="input min-w-0 flex-1"
          aria-label="Hũ"
          value={jarId}
          onChange={(e) => {
            setJarId(e.target.value);
            setConfirmSavings(false);
          }}
        >
          {jars.map((j) => (
            <option key={j.id} value={j.id}>
              {jarLabel(j)}
            </option>
          ))}
        </select>
        <input type="date" className="input w-full sm:w-44" aria-label="Ngày" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <MoneyInput value={amount} onChange={setAmount} className="input min-w-0 flex-1" aria-label="Số tiền" />
        <input className="input min-w-0 flex-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú" aria-label="Ghi chú" />
      </div>
      {type === "expense" && jars.find((j) => j.id === jarId)?.isSavings && confirmSavings && (
        <Banner icon="triangle-alert" tone="amber">
          Đây là hũ tiết kiệm — lưu lại nghĩa là ghi nhận một khoản rút. Bấm &ldquo;Xác nhận rút&rdquo; để lưu, hoặc đổi hũ để huỷ.
        </Banner>
      )}
      {error && (
        <p className="text-xs" style={{ color: "var(--color-accent-700)" }}>
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        {canDelete && (
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            aria-label="Xoá giao dịch"
            title="Xoá giao dịch"
            className="btn btn-secondary h-11 w-11 shrink-0 p-0"
          >
            <Icon name="trash-2" className="h-4 w-4" />
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
          Huỷ
        </button>
        <button type="button" disabled={saving || !amount} onClick={handleSave} className="btn btn-primary flex-1 justify-center">
          {saving ? "Đang lưu…" : type === "expense" && jars.find((j) => j.id === jarId)?.isSavings && confirmSavings ? "Xác nhận rút" : "Lưu"}
        </button>
      </div>
    </div>
  );
}
