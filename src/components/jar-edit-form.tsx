"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { BudgetField } from "@/components/budget-field";
import { Banner, Toggle } from "@/components/ui";
import { formatVND } from "@/lib/format";
import type { RealJar } from "@/lib/queries/jars";
import { deactivateJar, updateJar } from "@/app/(app)/jars/[id]/edit/actions";

export function JarEditForm({ jar }: { jar: RealJar }) {
  const router = useRouter();
  const [name, setName] = useState(jar.name);
  const [budget, setBudget] = useState(jar.monthlyBudget);
  const [alertAt80, setAlertAt80] = useState(jar.alertAt80);
  const [rollover, setRollover] = useState(jar.rollover);
  const [isSavings, setIsSavings] = useState(jar.isSavings);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateJar({ jarId: jar.id, name, monthlyBudget: budget, alertAt80, rollover, isSavings });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/jars/${jar.id}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Xoá hũ "${jar.name}"? Giao dịch cũ vẫn được giữ lại.`)) return;
    setDeleting(true);
    setError(null);
    const result = await deactivateJar(jar.id);
    setDeleting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/jars");
    router.refresh();
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <button type="button" onClick={() => router.back()} aria-label="Quay lại">
          <Icon name="arrow-left" className="h-[19px] w-[19px]" />
        </button>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px]" style={{ background: "color-mix(in srgb, currentColor 12%, transparent)", color: jar.color }}>
          <Icon name={jar.icon} className="h-4 w-4" />
        </div>
        <h1 className="mr-auto text-lg md:text-xl">Sửa {jar.name}</h1>
      </div>

      <div className="field max-w-sm">
        <label htmlFor="jar-name">Tên hũ</label>
        <input id="jar-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên hũ" />
      </div>

      <div className="max-w-sm border-t-2 border-divider pt-4">
        <div className="text-xs text-neutral-700">Ngân sách mỗi tháng</div>
        {jar.isShared ? (
          <div className="mt-2 font-heading text-[28px] font-extrabold tabular-nums">{formatVND(jar.monthlyBudget)}</div>
        ) : (
          <div className="mt-2">
            <BudgetField value={budget} onChange={setBudget} />
          </div>
        )}
      </div>

      {!jar.isShared && (
        <div className="max-w-sm border-t-2 border-divider">
          <Toggle
            label="Đánh dấu là hũ tiết kiệm"
            hint="Tích luỹ dần qua các tháng, không tính vào ngân sách còn lại"
            checked={isSavings}
            onChange={setIsSavings}
          />
          {isSavings && (
            <div className="pb-3.5">
              <Banner icon="piggy-bank" tone="green">
                Hũ tiết kiệm hiện &ldquo;Đã tiết kiệm được&rdquo; thay vì &ldquo;Còn được chi&rdquo;, luôn bật &ldquo;Chuyển phần
                còn lại sang tháng sau&rdquo; và tắt cảnh báo 80%, không tính vào tổng &ldquo;Còn lại&rdquo; trên trang chủ. Ghi
                khoản chi vào hũ này sẽ luôn được hỏi xác nhận vì đó coi như rút tiền tiết kiệm.
              </Banner>
            </div>
          )}
        </div>
      )}
      {!isSavings && (
        <div className="max-w-sm border-t-2 border-divider">
          <Toggle label="Cảnh báo khi dùng hết 80%" hint="Hiện dải cam trên dashboard" checked={alertAt80} onChange={setAlertAt80} />
          <Toggle label="Chuyển phần còn lại sang tháng sau" hint="Không dùng hết thì được cộng dồn" checked={rollover} onChange={setRollover} />
        </div>
      )}
      {jar.isShared ? (
        <p className="max-w-sm text-[11px] text-neutral-700">
          Đây là hũ gia đình — ngân sách tự tính từ phần đóng góp của cả 2 người, chỉnh ở trang{" "}
          <Link href="/household" className="text-accent hover:underline">
            Gia đình
          </Link>
          .
        </p>
      ) : (
        <p className="max-w-sm text-[11px] text-neutral-700">
          Muốn hũ dùng chung với vợ/chồng? Tạo hũ mới ở mục{" "}
          <Link href="/household" className="text-accent hover:underline">
            Gia đình
          </Link>{" "}
          thay vì chuyển hũ cá nhân này.
        </p>
      )}

      <div className="flex flex-col gap-2 border-t-2 border-divider pt-4">
        {error && (
          <p className="text-xs" style={{ color: "var(--color-accent-700)" }}>
            {error}
          </p>
        )}
        <div className="flex gap-2.5">
          <button type="button" disabled={deleting || saving} onClick={handleDelete} className="btn btn-secondary">
            {deleting ? "Đang xoá…" : "Xoá hũ"}
          </button>
          <button type="button" disabled={saving || deleting} onClick={handleSave} className="btn btn-primary flex-1 justify-center">
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
