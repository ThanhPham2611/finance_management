"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Banner, MoneyInput } from "@/components/ui";
import { formatVND, vnNow } from "@/lib/format";
import { computeDebtPlan, type DebtPayoffStrategy } from "@/lib/debt-plan";
import type { Debt } from "@/lib/queries/debts";
import { createDebt, deleteDebt, type DebtInput } from "@/app/(app)/debts/actions";

function monthsFromNowLabel(months: number): string {
  const d = vnNow();
  d.setMonth(d.getMonth() + months);
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}

const EMPTY_FORM: DebtInput = { name: "", principal: 0, interestRate: 0, minPayment: 0 };

export function DebtsClient({ debts }: { debts: Debt[] }) {
  const router = useRouter();
  const [form, setForm] = useState<DebtInput>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [extraMonthly, setExtraMonthly] = useState(0);
  const [strategy, setStrategy] = useState<DebtPayoffStrategy>("avalanche");

  const plan = useMemo(
    () => computeDebtPlan(debts.map((d) => ({ id: d.id, name: d.name, principal: d.principal, interestRate: d.interestRate, minPayment: d.minPayment })), extraMonthly, strategy),
    [debts, extraMonthly, strategy]
  );
  const scheduleById = new Map(plan.schedule.map((s) => [s.id, s]));
  const totalMinPayment = debts.reduce((s, d) => s + d.minPayment, 0);
  const totalPrincipal = debts.reduce((s, d) => s + d.principal, 0);

  async function handleAdd() {
    setAdding(true);
    setFormError(null);
    const result = await createDebt(form);
    setAdding(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setForm(EMPTY_FORM);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteDebt(id);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
      <div className="flex items-center gap-3 border-b-2 border-divider pb-4">
        <h1 className="mr-auto text-xl md:text-2xl">Kế hoạch trả nợ</h1>
      </div>

      {debts.length === 0 && (
        <Banner icon="info" tone="amber">
          Chưa có khoản nợ nào — thêm khoản đầu tiên bên dưới (vay, thẻ tín dụng, trả góp…).
        </Banner>
      )}

      <div>
        <div className="mb-2 text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Các khoản nợ</div>
        <div className="flex flex-col">
          {debts.map((d) => {
            const s = scheduleById.get(d.id);
            const priorityIdx = plan.order.indexOf(d.id);
            return (
              <div key={d.id} className="flex flex-col gap-1.5 border-b border-divider py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex flex-1 items-center gap-2.5">
                  <div
                    className="grid h-6 w-6 shrink-0 place-items-center text-[11px] font-semibold"
                    style={{ background: "var(--color-neutral-300)" }}
                  >
                    {priorityIdx >= 0 ? priorityIdx + 1 : "–"}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold">{d.name}</div>
                    <div className="text-[11px] text-neutral-700 tabular-nums">
                      Dư nợ {formatVND(d.principal)} · lãi {d.interestRate}%/năm · tối thiểu {formatVND(d.minPayment)}/tháng
                    </div>
                  </div>
                </div>
                <div className="text-right text-[11px] tabular-nums text-neutral-700 sm:w-48">
                  {s?.payoffMonth ? (
                    <>
                      Hết nợ sau {s.payoffMonth} tháng (~{monthsFromNowLabel(s.payoffMonth)})<br />
                      Lãi đã trả: {formatVND(s.totalInterestPaid)}
                    </>
                  ) : (
                    "Chưa đủ tiền trả để tính"
                  )}
                </div>
                <button
                  type="button"
                  disabled={deletingId === d.id}
                  onClick={() => handleDelete(d.id)}
                  className="text-neutral-500 hover:text-accent"
                  aria-label={`Xoá ${d.name}`}
                >
                  <Icon name="trash-2" className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Thêm khoản nợ</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="debt-name">Tên khoản nợ</label>
            <input
              id="debt-name"
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Thẻ tín dụng, vay mua xe…"
            />
          </div>
          <div className="field">
            <label htmlFor="debt-principal">Dư nợ hiện tại (VND)</label>
            <MoneyInput id="debt-principal" value={form.principal} onChange={(v) => setForm((f) => ({ ...f, principal: v }))} className="input" />
          </div>
          <div className="field">
            <label htmlFor="debt-rate">Lãi suất (%/năm)</label>
            <input
              id="debt-rate"
              type="number"
              min={0}
              max={100}
              step={0.1}
              className="input"
              value={form.interestRate || ""}
              onChange={(e) => setForm((f) => ({ ...f, interestRate: Number(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>
          <div className="field">
            <label htmlFor="debt-min">Trả tối thiểu mỗi tháng (VND)</label>
            <MoneyInput id="debt-min" value={form.minPayment} onChange={(v) => setForm((f) => ({ ...f, minPayment: v }))} className="input" />
          </div>
        </div>
        {formError && (
          <p className="mt-2 text-xs" style={{ color: "var(--color-accent-700)" }}>
            {formError}
          </p>
        )}
        <button type="button" disabled={adding} onClick={handleAdd} className="btn btn-primary mt-3">
          {adding ? "Đang thêm…" : "Thêm khoản nợ"}
        </button>
      </div>

      {debts.length > 0 && (
        <div className="border-t-2 border-divider pt-4">
          <div className="mb-2 text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Mô phỏng lịch trả</div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="field w-48">
              <label htmlFor="extra-monthly">Trả thêm mỗi tháng (ngoài tối thiểu)</label>
              <MoneyInput id="extra-monthly" value={extraMonthly} onChange={setExtraMonthly} className="input" />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStrategy("avalanche")}
                className={strategy === "avalanche" ? "btn btn-primary" : "btn btn-secondary"}
                title="Ưu tiên trả khoản lãi suất cao nhất trước — tiết kiệm tiền lãi nhiều nhất"
              >
                Avalanche (tiết kiệm lãi)
              </button>
              <button
                type="button"
                onClick={() => setStrategy("snowball")}
                className={strategy === "snowball" ? "btn btn-primary" : "btn btn-secondary"}
                title="Ưu tiên trả khoản dư nợ nhỏ nhất trước — hết từng khoản nhanh hơn, tạo động lực"
              >
                Snowball (hết nhanh)
              </button>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-neutral-700">
            Tổng trả mỗi tháng: {formatVND(totalMinPayment + Math.max(0, extraMonthly))} (tối thiểu {formatVND(totalMinPayment)} + trả thêm {formatVND(Math.max(0, extraMonthly))})
          </p>

          {plan.insufficientPayment ? (
            <Banner icon="triangle-alert" tone="accent">
              Với mức trả này, tổng dư nợ không giảm hết trong vòng 50 năm mô phỏng — tăng số tiền trả thêm mỗi tháng.
            </Banner>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Hết nợ sau</div>
                <div className="font-heading text-2xl font-extrabold tabular-nums">{plan.months} tháng</div>
                <div className="text-[11px] text-neutral-700">~{plan.months !== null && monthsFromNowLabel(plan.months)}</div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Tổng tiền lãi phải trả</div>
                <div className="font-heading text-2xl font-extrabold tabular-nums">{formatVND(plan.totalInterestPaid)}</div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Tổng đã trả (gốc + lãi)</div>
                <div className="font-heading text-2xl font-extrabold tabular-nums">{formatVND(plan.totalPaid)}</div>
                <div className="text-[11px] text-neutral-700">so với dư nợ gốc {formatVND(totalPrincipal)}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
