"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { Banner, MoneyInput } from "@/components/ui";
import { formatVND } from "@/lib/format";
import type { RealJar } from "@/lib/queries/jars";

/**
 * What-if simulator, ban 2 (2026-09-13) — ban dau lam kieu keo % nhu
 * /allocate (chi bo nut Ap dung) nhung Thanh phan hoi la khong co tac
 * dung gi, vi /allocate von da cho keo so thoai mai khong bat buoc luu.
 * Thiet ke lai theo dung cau hoi "what-if" thuc te hay gap: "neu giu muc
 * ngan sach moi nay trong N thang thi du/thieu bao nhieu SO VOI CACH DANG
 * AP DUNG" — moi hu chi sua truc tiep so tien ngan sach moi (thay vi keo
 * %), phan con lai KHONG bi anh huong (khac voi /allocate, o day khong
 * can chia het 100% thu nhap — chi la "neu doi rieng hu nay thi sao").
 */
export function SimulatorClient({ jars, hasDebts }: { jars: RealJar[]; hasDebts: boolean }) {
  const [newBudgets, setNewBudgets] = useState<number[]>(jars.map((j) => j.monthlyBudget));
  const [months, setMonths] = useState(6);

  if (jars.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <Icon name="flask-conical" className="h-8 w-8 text-neutral-500" />
        <h1 className="text-lg">Chưa có hũ cá nhân nào để mô phỏng</h1>
        <p className="max-w-sm text-sm text-neutral-700">Tạo ít nhất một hũ ngân sách cá nhân trước, sau đó quay lại đây để thử các kịch bản.</p>
      </div>
    );
  }

  function setBudget(index: number, value: number) {
    setNewBudgets((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function resetToCurrent() {
    setNewBudgets(jars.map((j) => j.monthlyBudget));
  }

  const deltas = jars.map((j, i) => newBudgets[i] - j.monthlyBudget);
  const monthlyDelta = deltas.reduce((s, d) => s + d, 0);
  const adjustedCount = deltas.filter((d) => d !== 0).length;
  // monthlyDelta < 0: cat giam -> tiet kiem duoc them. monthlyDelta > 0:
  // tang len -> can them thu nhap moi thang de duy tri.
  const netOverMonths = -monthlyDelta * months;
  const isSaving = netOverMonths > 0.01;
  const isCosting = netOverMonths < -0.01;

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
      <div className="flex items-center gap-3 border-b-2 border-divider pb-4">
        <h1 className="mr-auto text-xl md:text-2xl">Mô phỏng (What-if)</h1>
        <button type="button" onClick={resetToCurrent} className="btn btn-secondary">
          Về hiện tại
        </button>
      </div>

      <Banner icon="info" tone="amber">
        Sửa ngân sách 1-2 hũ bên dưới để thử &quot;nếu tôi đổi mức này thì sao&quot; — KHÔNG lưu lại gì. Ưng ý mức nào thì qua trang{" "}
        <Link href="/allocate" className="underline">
          Chia lương
        </Link>{" "}
        để áp dụng thật.
      </Banner>

      <div className="flex flex-wrap items-end gap-4 border-b-2 border-divider pb-4">
        <div className="field w-40">
          <label htmlFor="sim-months">Duy trì trong bao lâu</label>
          <div className="flex items-center gap-2">
            <input
              id="sim-months"
              type="number"
              min={1}
              max={60}
              className="input"
              value={months}
              onChange={(e) => setMonths(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
            />
            <span className="text-[13px] text-neutral-700">tháng</span>
          </div>
        </div>

        <div className="flex-1">
          <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">
            So với cách đang áp dụng, sau {months} tháng
          </div>
          {adjustedCount === 0 ? (
            <div className="mt-1 font-heading text-2xl font-extrabold tabular-nums text-neutral-700">Chưa đổi gì</div>
          ) : (
            <div
              className="mt-1 font-heading text-2xl font-extrabold tabular-nums"
              style={{ color: isSaving ? "var(--color-green-ink)" : isCosting ? "var(--color-accent-700)" : "var(--color-text)" }}
            >
              {isSaving && `Dư thêm ${formatVND(netOverMonths)}`}
              {isCosting && `Cần thêm ${formatVND(-netOverMonths)}`}
              {!isSaving && !isCosting && "Không đổi"}
            </div>
          )}
          {adjustedCount > 0 && (
            <div className="text-[11px] text-neutral-700 tabular-nums">
              {monthlyDelta < 0 ? `Cắt ${formatVND(-monthlyDelta)}/tháng` : `Tăng ${formatVND(monthlyDelta)}/tháng`} · {adjustedCount} hũ thay đổi
            </div>
          )}
        </div>
      </div>

      {isSaving && hasDebts && (
        <Banner icon="credit-card" tone="green">
          Duy trì mức này dư ra {formatVND(-monthlyDelta)}/tháng. Thử nhập số này vào &quot;Trả thêm mỗi tháng&quot; ở trang{" "}
          <Link href="/debts" className="underline">
            Kế hoạch trả nợ
          </Link>{" "}
          để xem trả nợ nhanh hơn bao nhiêu tháng.
        </Banner>
      )}

      <div className="flex flex-col">
        {jars.map((jar, i) => {
          const delta = deltas[i];
          const alreadyOver = jar.spent > newBudgets[i] + 0.01;
          return (
            <div key={jar.id} className="flex flex-col gap-2 border-b border-divider py-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2.5 sm:w-40 sm:shrink-0">
                <Icon name={jar.icon} className="h-4 w-4" style={{ color: jar.color }} />
                <div>
                  <div className="text-[13px] font-semibold">{jar.name}</div>
                  <div className="text-[11px] text-neutral-700 tabular-nums">hiện tại {formatVND(jar.monthlyBudget)}</div>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-3">
                <MoneyInput
                  value={newBudgets[i]}
                  onChange={(v) => setBudget(i, v)}
                  className="input w-36 text-right tabular-nums"
                  aria-label={`Ngân sách mới cho ${jar.name}`}
                />
                {delta !== 0 && (
                  <span className="text-[12px] tabular-nums" style={{ color: delta < 0 ? "var(--color-green-ink)" : "var(--color-accent-700)" }}>
                    ({delta > 0 ? "+" : ""}
                    {formatVND(delta)})
                  </span>
                )}
              </div>
              {alreadyOver && (
                <div className="text-[11px]" style={{ color: "var(--color-accent-700)" }}>
                  Đã chi {formatVND(jar.spent)} tháng này — cao hơn mức mới rồi.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
