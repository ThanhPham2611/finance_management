"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DebtWithPayments } from "@hu/data";
import { calculateDebtProgress, describeReminder, summarizeDebts, type DebtProgress } from "@hu/domain";
import { Icon } from "@/components/icon";
import { Badge, Card, EmptyState } from "@/components/primitives";
import { REMINDER_INK } from "@/components/debts-overview-card";
import { MoneyInput, ProgressBar } from "@/components/ui";
import { formatVND } from "@/lib/format";
import { addDebtPayment, archiveDebt, createDebt, deleteDebtPayment } from "@/app/(app)/debts/actions";

const dmy = (ymd: string) => ymd.split("-").reverse().join("/");

export function DebtsClient({ debts, today }: { debts: DebtWithPayments[]; today: string }) {
  const [adding, setAdding] = useState(debts.length === 0);
  const summary = summarizeDebts(
    debts.map((debt) => ({ debt, payments: debt.payments })),
    today,
  );

  return (
    <div className="page-stack">
      <header className="page-header flex-wrap">
        <div className="mr-auto"><p className="eyebrow">KHOẢN PHẢI TRẢ</p><h1>Trả nợ</h1><p>Trả góp, vay người quen... theo dõi riêng, không trừ vào hũ nào.</p></div>
        <button type="button" className="btn btn-primary" onClick={() => setAdding((value) => !value)}>
          {adding ? "Đóng" : "Thêm khoản nợ"}
        </button>
      </header>

      {debts.length > 0 && (
        <div className="grid grid-cols-2 gap-3" data-testid="debt-summary">
          <Card>
            <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Tổng còn nợ</div>
            <div className="mt-1.5 font-heading text-2xl font-extrabold tabular-nums">{formatVND(summary.remaining)}đ</div>
          </Card>
          <Card>
            <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Cần trả mỗi tháng</div>
            <div className="mt-1.5 font-heading text-2xl font-extrabold tabular-nums">{formatVND(summary.monthlyNeeded)}đ</div>
          </Card>
        </div>
      )}

      {adding && <AddDebtForm today={today} onDone={() => setAdding(false)} />}

      {debts.length === 0 && !adding && (
        <EmptyState icon="hand-coins" title="Chưa có khoản nợ nào" message="Thêm một khoản trả góp hoặc khoản vay để biết mỗi tháng cần dành bao nhiêu." />
      )}

      <div className="flex flex-col gap-3">
        {debts.map((debt) => (
          <DebtCard key={debt.id} debt={debt} progress={calculateDebtProgress(debt, debt.payments, today)} today={today} />
        ))}
      </div>
    </div>
  );
}

function AddDebtForm({ today, onDone }: { today: string; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState(0);
  const [termMonths, setTermMonths] = useState(12);
  const [startDate, setStartDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const result = await createDebt({ name, principal, termMonths, startDate });
    setSaving(false);
    if (result.error) return setError(result.error);
    router.refresh();
    onDone();
  }

  return (
    <Card className="flex flex-col gap-3" aria-label="Thêm khoản nợ">
      <div className="field">
        <label htmlFor="debt-name">Tên khoản nợ</label>
        <input id="debt-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Trả góp iPhone, Nợ anh A…" />
      </div>
      <div className="field">
        <label htmlFor="debt-principal">Tổng số tiền phải trả (VND, gồm cả lãi nếu có)</label>
        <MoneyInput id="debt-principal" className="input" value={principal} onChange={setPrincipal} placeholder="0" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="field">
          <label htmlFor="debt-term">Dự kiến trả trong (tháng)</label>
          <input id="debt-term" className="input" type="number" min={1} max={600} step={1} value={termMonths || ""} onChange={(e) => setTermMonths(Math.trunc(Number(e.target.value)))} />
        </div>
        <div className="field">
          <label htmlFor="debt-start">Bắt đầu từ</label>
          <input id="debt-start" className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
      </div>
      {principal > 0 && termMonths > 0 && <p className="text-xs text-neutral-700">Trả đều khoảng {formatVND(Math.ceil(principal / termMonths))}đ mỗi tháng.</p>}
      {error && <p role="alert" className="text-xs" style={{ color: "var(--color-accent-700)" }}>{error}</p>}
      <button type="button" className="btn btn-primary" disabled={saving || !name.trim() || !principal || !termMonths || !startDate} onClick={save}>
        {saving ? "Đang lưu…" : "Lưu khoản nợ"}
      </button>
    </Card>
  );
}

function DebtCard({ debt, progress, today }: { debt: DebtWithPayments; progress: DebtProgress; today: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState(0);
  const [paidOn, setPaidOn] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status } = progress;

  async function mutate(run: () => Promise<{ error?: string }>, after?: () => void) {
    setBusy(true);
    setError(null);
    const result = await run();
    setBusy(false);
    if (result.error) return setError(result.error);
    after?.();
    router.refresh();
  }

  return (
    <Card data-testid="debt-card" data-status={status} className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg">{debt.name}</h2>
          <p className="text-xs text-neutral-700">
            Tổng {formatVND(debt.principal)}đ · {debt.termMonths} tháng · hạn {dmy(progress.dueDate)}
          </p>
        </div>
        {status === "paid" && <Badge tone="success">Đã tất toán</Badge>}
        {status === "overdue" && <Badge tone="danger">Quá hạn</Badge>}
      </div>

      <div>
        <ProgressBar pct={progress.pct} color={status === "overdue" ? "var(--color-accent)" : "var(--color-primary)"} height={8} />
        <div className="mt-1.5 flex justify-between text-xs tabular-nums text-neutral-700">
          <span>Đã trả {formatVND(progress.paid)}đ ({progress.pct}%)</span>
          <span>Còn {formatVND(progress.remaining)}đ</span>
        </div>
      </div>

      {progress.reminder && (
        <p data-testid="debt-reminder" data-state={progress.reminder.state} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: REMINDER_INK[progress.reminder.state] }}>
          <Icon name={progress.reminder.state === "later" ? "calendar-clock" : "bell-ring"} className="h-4 w-4 shrink-0" />
          {describeReminder(progress.reminder, (value) => `${formatVND(value)}đ`)}
        </p>
      )}

      {status === "active" && (
        <p className="text-sm" data-testid="debt-monthly">
          Mỗi tháng cần trả <b>{formatVND(progress.monthlyNeeded)}đ</b> · còn {progress.monthsLeft} tháng
          {progress.monthlyNeeded > progress.plannedMonthly && <span style={{ color: "var(--color-amber-ink)" }}> (kế hoạch ban đầu {formatVND(progress.plannedMonthly)}đ — đang chậm)</span>}
        </p>
      )}

      {status !== "paid" && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="field min-w-36 flex-1">
            <label htmlFor={`pay-${debt.id}`}>Số tiền vừa trả</label>
            <MoneyInput id={`pay-${debt.id}`} className="input" value={amount} onChange={setAmount} placeholder={formatVND(progress.monthlyNeeded)} />
          </div>
          <div className="field">
            <label htmlFor={`pay-date-${debt.id}`}>Ngày</label>
            <input id={`pay-date-${debt.id}`} className="input" type="date" value={paidOn} max={today} onChange={(e) => setPaidOn(e.target.value)} />
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setAmount(progress.monthlyNeeded)}>
            Trả đủ kỳ này
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !amount || !paidOn}
            onClick={() => mutate(() => addDebtPayment({ debtId: debt.id, amount, paidOn }), () => setAmount(0))}
          >
            {busy ? "Đang lưu…" : "Ghi nhận trả nợ"}
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-xs" style={{ color: "var(--color-accent-700)" }}>{error}</p>}

      {debt.payments.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-neutral-700">Lịch sử trả ({debt.payments.length})</summary>
          <ul className="mt-2 flex flex-col">
            {debt.payments.map((payment) => (
              <li key={payment.id} className="flex items-center gap-2 border-b border-divider py-1.5 text-[13px] last:border-b-0">
                <span className="flex-1 text-neutral-700">{dmy(payment.paidOn)}</span>
                <span className="tabular-nums">{formatVND(payment.amount)}đ</span>
                <button type="button" disabled={busy} aria-label={`Xoá lần trả ${formatVND(payment.amount)}đ ngày ${dmy(payment.paidOn)}`} className="icon-button" onClick={() => mutate(() => deleteDebtPayment(payment.id))}>
                  <Icon name="trash-2" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={busy}
          className="btn btn-ghost text-destructive"
          onClick={() => {
            if (window.confirm(`Bỏ khoản nợ "${debt.name}" khỏi danh sách? Lịch sử trả vẫn được giữ lại.`)) void mutate(() => archiveDebt(debt.id));
          }}
        >
          Bỏ khoản này
        </button>
      </div>
    </Card>
  );
}
