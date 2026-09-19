"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui";
import { formatVND } from "@/lib/format";
import { resolveLeftovers } from "@/app/(app)/leftover-actions";
import type { MonthEndJarInfo } from "@/lib/queries/leftover";

/** Banner hoi xac nhan cong tien du cuoi thang (cac hu KHONG bat rollover)
 * vao hu "Quy du" — hien tren Dashboard khi phat hien co du chua xu ly. */
export function LeftoverBanner({ items, monthLabel }: { items: MonthEndJarInfo[]; monthLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"confirm" | "decline" | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dismissed || items.length === 0) return null;

  const total = items.reduce((s, i) => s + i.leftover, 0);
  const detail = items.map((i) => `${i.jarName} (${formatVND(i.leftover)})`).join(", ");

  async function handle(action: "confirm" | "decline") {
    setBusy(action);
    setError(null);
    const result = await resolveLeftovers({ action });
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    setDismissed(true);
    router.refresh();
  }

  return (
    <Banner icon="piggy-bank" tone="amber">
      <div className="flex flex-col gap-2">
        <div>
          <span className="font-semibold">
            {monthLabel} có {items.length} hũ dư, tổng {formatVND(total)}:
          </span>{" "}
          {detail}. Cộng hết vào hũ &quot;Quỹ dư&quot;?
        </div>
        {error && <div className="text-[12px] text-accent-700">{error}</div>}
        <div className="flex gap-2">
          <button type="button" disabled={busy !== null} onClick={() => handle("confirm")} className="btn btn-primary">
            {busy === "confirm" ? "Đang cộng…" : "Cộng vào Quỹ dư"}
          </button>
          <button type="button" disabled={busy !== null} onClick={() => handle("decline")} className="btn btn-secondary">
            {busy === "decline" ? "Đang bỏ qua…" : "Bỏ qua"}
          </button>
        </div>
      </div>
    </Banner>
  );
}
