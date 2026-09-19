"use client";

import Link from "next/link";
import { useState } from "react";
import { BudgetField } from "@/components/budget-field";
import { Icon } from "@/components/icon";
import { Toggle } from "@/components/ui";
import { PRESETS } from "@/lib/data";
import { createJars } from "./actions";

type Draft = {
  key: string;
  presetName: string | null;
  name: string;
  icon: string;
  hue: string;
  budget: number;
};

function draftFromPreset(preset: (typeof PRESETS)[number]): Draft {
  return { key: crypto.randomUUID(), presetName: preset.name, name: preset.name, icon: preset.icon, hue: preset.hue, budget: 0 };
}

function draftCustom(): Draft {
  return { key: crypto.randomUUID(), presetName: null, name: "", icon: "wallet", hue: "var(--color-accent)", budget: 0 };
}

export default function NewJarPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [alertAt80, setAlertAt80] = useState(true);
  const [rollover, setRollover] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function togglePreset(preset: (typeof PRESETS)[number]) {
    setDrafts((prev) =>
      prev.some((d) => d.presetName === preset.name)
        ? prev.filter((d) => d.presetName !== preset.name)
        : [...prev, draftFromPreset(preset)]
    );
  }

  function addCustom() {
    setDrafts((prev) => [...prev, draftCustom()]);
  }

  function removeDraft(key: string) {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  }

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const result = await createJars(
      drafts.map((d) => ({
        name: d.name || "Hũ mới",
        icon: d.icon,
        color: d.hue,
        monthlyBudget: d.budget,
        alertAt80,
        rollover,
      }))
    );
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    setSaved(true);
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <Icon name="check" className="h-10 w-10" style={{ color: "var(--color-green-ink)" }} />
        <h1 className="text-xl">Đã tạo {drafts.length} hũ</h1>
        <ul className="text-sm text-neutral-700">
          {drafts.map((d) => (
            <li key={d.key}>{d.name || "Hũ mới"}</li>
          ))}
        </ul>
        <Link href="/jars" className="btn btn-primary">
          Về danh sách hũ
        </Link>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
        <div className="flex items-center gap-3 border-b-2 border-divider pb-4">
          <Link href="/jars" aria-label="Đóng">
            <Icon name="x" className="h-[19px] w-[19px]" />
          </Link>
          <h1 className="mr-auto text-lg md:text-xl">Tạo hũ mới</h1>
          <span className="text-xs text-neutral-700">Bước 1/2</span>
        </div>

        <div>
          <div className="font-heading text-xl font-extrabold">Chọn các hũ muốn tạo</div>
          <p className="mt-1.5 text-sm text-neutral-700">Chọn bao nhiêu mẫu cũng được, hoặc bấm &ldquo;Tự đặt tên&rdquo; để thêm từng hũ riêng — tạo một lần cho tất cả.</p>
        </div>

        <div className="grid grid-cols-2 gap-px border border-divider bg-divider sm:grid-cols-4">
          {PRESETS.map((p) => {
            const selected = drafts.some((d) => d.presetName === p.name);
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => togglePreset(p)}
                className="flex flex-col gap-2 p-3.5 text-left"
                style={{ background: selected ? "var(--color-accent-100)" : "var(--color-bg)" }}
              >
                <div className="flex items-center gap-2">
                  <Icon name={p.icon} className="h-[17px] w-[17px]" style={{ color: p.hue }} />
                  <span className="text-[13px] font-semibold">{p.name}</span>
                  {selected && <Icon name="check" className="ml-auto h-4 w-4 text-accent" />}
                </div>
                <div className="text-[11px] text-neutral-700">Gợi ý {p.suggest} thu nhập</div>
              </button>
            );
          })}
          <button type="button" onClick={addCustom} className="col-span-2 flex flex-col gap-2 bg-bg p-3.5 text-left sm:col-span-4">
            <div className="flex items-center gap-2">
              <Icon name="pencil-line" className="h-[17px] w-[17px] text-accent" />
              <span className="text-[13px] font-semibold">Tự đặt tên</span>
            </div>
            <div className="text-[11px] text-neutral-700">Bấm nhiều lần để thêm nhiều hũ tự đặt tên</div>
          </button>
        </div>

        {drafts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {drafts.map((d) => (
              <span key={d.key} className="flex items-center gap-1.5 border border-divider px-2.5 py-1.5 text-xs">
                <Icon name={d.icon} className="h-3.5 w-3.5" style={{ color: d.hue }} />
                {d.name || "Hũ tự đặt tên"}
                <button type="button" onClick={() => removeDraft(d.key)} aria-label={`Bỏ chọn ${d.name || "hũ"}`}>
                  <Icon name="x" className="h-3.5 w-3.5 text-neutral-500" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3.5 border-t-2 border-divider pt-4">
          <span className="text-xs text-neutral-700">Đã chọn {drafts.length} hũ</span>
          <button type="button" disabled={drafts.length === 0} onClick={() => setStep(2)} className="btn btn-primary ml-auto">
            Tiếp tục
          </button>
        </div>
      </div>
    );
  }

  const canSave = drafts.length > 0 && drafts.every((d) => d.name.trim() !== "");

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
      <div className="flex items-center gap-3 border-b-2 border-divider pb-4">
        <button type="button" onClick={() => setStep(1)} aria-label="Quay lại">
          <Icon name="arrow-left" className="h-[19px] w-[19px]" />
        </button>
        <h1 className="mr-auto text-lg md:text-xl">Đặt tên &amp; ngân sách</h1>
        <span className="text-xs text-neutral-700">Bước 2/2</span>
      </div>

      <div className="flex flex-col gap-4">
        {drafts.map((d, i) => (
          <div key={d.key} className="border border-divider p-4">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center" style={{ background: "color-mix(in srgb, currentColor 12%, transparent)", color: d.hue }}>
                <Icon name={d.icon} className="h-4 w-4" />
              </div>
              <input
                className="input flex-1"
                value={d.name}
                onChange={(e) => updateDraft(d.key, { name: e.target.value })}
                placeholder={`Tên hũ ${i + 1}`}
              />
              {drafts.length > 1 && (
                <button type="button" onClick={() => removeDraft(d.key)} aria-label="Bỏ hũ này" className="shrink-0 text-neutral-500 hover:text-accent">
                  <Icon name="x" className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-3">
              <div className="text-xs text-neutral-700">Ngân sách mỗi tháng</div>
              <div className="mt-2">
                <BudgetField value={d.budget} onChange={(budget) => updateDraft(d.key, { budget })} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-sm border-t-2 border-divider">
        <div className="pt-3 text-xs text-neutral-700">Áp dụng cho tất cả hũ ở trên</div>
        <Toggle label="Cảnh báo khi dùng hết 80%" hint="Hiện dải cam trên dashboard" checked={alertAt80} onChange={setAlertAt80} />
        <Toggle label="Chuyển phần còn lại sang tháng sau" hint="Không dùng hết thì được cộng dồn" checked={rollover} onChange={setRollover} />
      </div>
      <p className="max-w-sm text-[11px] text-neutral-700">
        Muốn hũ dùng chung với vợ/chồng? Tạo ở mục <Link href="/household" className="text-accent hover:underline">Gia đình</Link> để tránh trùng với hũ cá nhân.
      </p>

      <div className="flex flex-col gap-2 border-t-2 border-divider pt-4">
        {saveError && (
          <p className="text-xs" style={{ color: "var(--color-accent-700)" }}>
            {saveError}
          </p>
        )}
        <button type="button" disabled={saving || !canSave} onClick={handleSave} className="btn btn-primary">
          {saving ? "Đang lưu…" : `Lưu ${drafts.length} hũ`}
        </button>
      </div>
    </div>
  );
}
