/** Mẫu hũ gợi ý khi tạo hũ. Màu là hex vì `createJarInputSchema` chỉ nhận `#RRGGBB`
 * (web đang lưu `hue` dạng oklch trong src/lib/data.ts — những chuỗi đó bị schema từ chối). */
export const JAR_PRESETS = [
  { name: "Ăn uống", icon: "utensils", color: "#AB5637", suggest: "25–30%" },
  { name: "Sinh hoạt", icon: "house", color: "#496684", suggest: "15%" },
  { name: "Đi lại", icon: "bus", color: "#2C7866", suggest: "7%" },
  { name: "Mua sắm", icon: "shopping-bag", color: "#9A5B13", suggest: "10%" },
  { name: "Con cái", icon: "baby", color: "#7A659E", suggest: "12%" },
  { name: "Giáo dục", icon: "graduation-cap", color: "#1D777B", suggest: "6%" },
  { name: "Sức khoẻ", icon: "heart-pulse", color: "#965253", suggest: "5%" },
  { name: "Tiết kiệm", icon: "piggy-bank", color: "#307A4F", suggest: "10%" },
] as const;

export type JarPreset = (typeof JAR_PRESETS)[number];

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** Màu hũ an toàn để vẽ: dữ liệu cũ có thể là `oklch(...)`/`var(...)` mà React Native không hiểu. */
export function safeColor(value: string | null | undefined, fallback = "#9A5B13"): string {
  return value && HEX_COLOR.test(value) ? value : fallback;
}

/** Màu hex để ghi DB cho một hũ tạo từ mẫu (theo tên). Hũ tự đặt tên (`name` null/lạ) dùng `hue` nếu đã là hex, không thì màu mặc định. */
export function presetColor(name: string | null | undefined, hue?: string): string {
  return JAR_PRESETS.find((preset) => preset.name === name)?.color ?? safeColor(hue);
}
