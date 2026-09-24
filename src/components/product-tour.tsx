"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { markTourSeen } from "@/app/(app)/tour-actions";

type Step = {
  title: string;
  body: string;
  /** Cac data-tour co the trung voi buoc nay, uu tien phan tu dau tien
   * DANG HIEN THI (vd desktop/mobile khac nhau theo breakpoint). Khong co
   * = buoc "the giua man hinh" (chao mung / ket thuc). */
  target?: string[];
};

const FULL_STEPS: Step[] = [
  { title: "Chào mừng đến với Hũ", body: "Xem nhanh vài điểm chính trên Tổng quan trước khi bắt đầu." },
  {
    title: "Ghi giao dịch nhanh",
    body: "Ghi lại một khoản chi chỉ mất vài giây, bất cứ lúc nào.",
    target: ["add-transaction-desktop", "add-transaction-mobile"],
  },
  { title: "Số tiền còn lại", body: "Đây là số bạn còn có thể chi tháng này, chia theo từng hũ ngân sách.", target: ["remaining-summary"] },
  { title: "Các hũ ngân sách", body: "Mỗi hũ là một khoản riêng — chạm vào một hũ để xem chi tiết.", target: ["jars-grid"] },
  { title: "Giao dịch gần nhất", body: "Chạm vào một giao dịch để sửa nhanh.", target: ["recent-transactions"] },
  { title: "Xong rồi!", body: "Xem lại hướng dẫn này bất cứ lúc nào ở biểu tượng cạnh tên bạn." },
];

const EMPTY_STEPS: Step[] = [
  { title: "Chào mừng đến với Hũ", body: "Bắt đầu bằng cách tạo hũ ngân sách đầu tiên." },
  { title: "Tạo hũ đầu tiên", body: "Ví dụ: Ăn uống, Di chuyển, Giải trí...", target: ["empty-create-jar"] },
  { title: "Xong rồi!", body: "Xem lại hướng dẫn này bất cứ lúc nào ở biểu tượng cạnh tên bạn." },
];

/** Phan tu dau tien khop 1 trong cac data-tour truyen vao MA DANG HIEN THI
 * (loai phan tu bi an do responsive, vd nut desktop tren man hinh mobile). */
function resolveRect(targets: string[] | undefined): DOMRect | null {
  if (!targets) return null;
  for (const name of targets) {
    const el = document.querySelector(`[data-tour="${name}"]`);
    if (el instanceof HTMLElement && el.offsetParent !== null) return el.getBoundingClientRect();
  }
  return null;
}

const OVERLAY_COLOR = "rgba(32, 30, 29, .6)";

export function ProductTour({ initialOpen, hasJars }: { initialOpen: boolean; hasJars: boolean }) {
  const router = useRouter();
  const steps = hasJars ? FULL_STEPS : EMPTY_STEPS;
  const [open, setOpen] = useState(initialOpen);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [busy, setBusy] = useState(false);

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  // Do lai vi tri spotlight moi khi doi buoc, va khi resize/scroll (target
  // co the doi vi tri hoac chuyen sang phan tu desktop/mobile khac).
  useEffect(() => {
    if (!open) return;
    function recompute() {
      setRect(resolveRect(step.target));
    }
    recompute();
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [open, step]);

  async function close() {
    setBusy(true);
    await markTourSeen().catch(() => {});
    setBusy(false);
    setOpen(false);
    // Don ?tour=1 khoi URL (neu mo qua nut "Xem huong dan lai") de F5 khong
    // tu mo lai tour.
    router.replace("/");
  }

  // Dong bang Esc, giong pattern chat-drawer.tsx.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const tooltipStyle: React.CSSProperties = rect
    ? {
        position: "fixed",
        left: Math.min(Math.max(rect.left, 16), window.innerWidth - 316),
        top: rect.top < window.innerHeight / 2 ? rect.bottom + 12 : undefined,
        bottom: rect.top >= window.innerHeight / 2 ? window.innerHeight - rect.top + 12 : undefined,
      }
    : { position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" };

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Hướng dẫn sử dụng">
      {/* Lop nen toi — co "khoet lo" quanh target bang box-shadow neu co rect */}
      <div
        className="fixed"
        style={
          rect
            ? { left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12, boxShadow: `0 0 0 9999px ${OVERLAY_COLOR}`, border: "2px solid var(--color-accent)" }
            : { inset: 0, background: OVERLAY_COLOR }
        }
      />
      {/* Chan click xuyen xuong noi dung ben duoi — chi Esc/nut moi dong */}
      <div className="fixed inset-0" onClick={(e) => e.stopPropagation()} />

      <div style={tooltipStyle} className={rect ? "w-[300px]" : ""}>
        <div className={rect ? "" : "w-[300px] px-4"}>
          <div className="flex flex-col gap-2 border-2 bg-bg p-4" style={{ borderColor: "var(--color-text)", boxShadow: "var(--shadow-lg)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">
                Bước {stepIndex + 1}/{steps.length}
              </span>
              <button type="button" onClick={close} aria-label="Đóng hướng dẫn" className="text-neutral-500 hover:text-accent">
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
            <div className="font-heading text-lg font-extrabold">{step.title}</div>
            <p className="text-[13px] text-neutral-700">{step.body}</p>
            <div className="mt-1 flex items-center gap-2">
              <button type="button" onClick={close} className="btn btn-ghost mr-auto">
                Bỏ qua
              </button>
              {stepIndex > 0 && (
                <button type="button" onClick={() => setStepIndex((i) => i - 1)} className="btn btn-secondary">
                  Trước
                </button>
              )}
              <button type="button" disabled={busy} onClick={() => (isLast ? close() : setStepIndex((i) => i + 1))} className="btn btn-primary">
                {isLast ? "Bắt đầu dùng Hũ" : "Tiếp theo"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
