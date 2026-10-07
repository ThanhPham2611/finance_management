import { describe, expect, it } from "vitest";
import { createJarInputSchema, presetColor } from "@hu/domain";
import { PRESETS } from "./data";

// Wizard /jars/new gửi màu của mẫu hũ vào createJars; schema chỉ nhận #RRGGBB.
const payload = (color: string) => ({ name: "Hũ", icon: "wallet", color, monthlyBudget: 0 });

describe("màu hũ gửi từ wizard web", () => {
  it("màu CSS thô (oklch/var) bị schema từ chối — đây là lỗi wizard từng mắc", () => {
    expect(createJarInputSchema.safeParse(payload(PRESETS[0].hue)).success).toBe(false);
    expect(createJarInputSchema.safeParse(payload("var(--color-accent)")).success).toBe(false);
  });

  it("mọi mẫu hũ và hũ tự đặt tên đều ra màu hợp lệ", () => {
    for (const preset of PRESETS) {
      expect(createJarInputSchema.safeParse(payload(presetColor(preset.name, preset.hue))).success, preset.name).toBe(true);
    }
    expect(createJarInputSchema.safeParse(payload(presetColor(null, "var(--color-accent)"))).success).toBe(true);
  });

  it("hũ tự đặt tên giữ màu hex hợp lệ nếu có", () => {
    expect(presetColor(null, "#112233")).toBe("#112233");
  });
});
