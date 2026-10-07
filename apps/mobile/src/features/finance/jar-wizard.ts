import type { CreateJarInput, JarPreset } from "@hu/domain";

export type JarWizardDraft = { key: string; presetName: string | null; name: string; icon: string; color: string; budget: number; isSavings: boolean };

let counter = 0;
const nextKey = () => `draft-${++counter}`;

export function draftFromPreset(preset: JarPreset): JarWizardDraft {
  // Chọn mẫu "Tiết kiệm" là đã chọn đúng ý định nên bật sẵn cờ hũ tiết kiệm.
  return { key: nextKey(), presetName: preset.name, name: preset.name, icon: preset.icon, color: preset.color, budget: 0, isSavings: preset.name === "Tiết kiệm" };
}

export function draftCustom(): JarWizardDraft {
  return { key: nextKey(), presetName: null, name: "", icon: "wallet", color: "#9A5B13", budget: 0, isSavings: false };
}

export function togglePreset(drafts: JarWizardDraft[], preset: JarPreset): JarWizardDraft[] {
  return drafts.some((draft) => draft.presetName === preset.name) ? drafts.filter((draft) => draft.presetName !== preset.name) : [...drafts, draftFromPreset(preset)];
}

export function canSaveDrafts(drafts: JarWizardDraft[]): boolean {
  return drafts.length > 0 && drafts.every((draft) => draft.name.trim() !== "");
}

/** Cảnh báo 80% và cộng dồn là tuỳ chọn chung cho cả lô; hũ tiết kiệm bị `normalizeJarForWrite` (@hu/data) ép về tắt cảnh báo + luôn cộng dồn. */
export function toCreateInputs(drafts: JarWizardDraft[], options: { alertAt80: boolean; rollover: boolean }): CreateJarInput[] {
  return drafts.map((draft) => ({ name: draft.name.trim() || "Hũ mới", icon: draft.icon, color: draft.color, monthlyBudget: draft.budget, alertAt80: options.alertAt80, rollover: options.rollover, isSavings: draft.isSavings }));
}
