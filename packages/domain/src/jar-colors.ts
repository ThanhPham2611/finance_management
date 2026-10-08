import { JAR_PRESETS } from "./presets";

/** Bảng màu hũ: 8 màu của mẫu hũ đứng đầu, sau đó 24 màu khác tông để vài chục hũ vẫn phân biệt được. Chỉ hex vì `createJarInputSchema` chỉ nhận `#RRGGBB`. */
export const JAR_COLORS: readonly string[] = [
  ...JAR_PRESETS.map((preset) => preset.color),
  "#C2410C", "#B91C1C", "#BE185D", "#A21CAF", "#6D28D9", "#4338CA", "#1D4ED8", "#0369A1",
  "#0E7490", "#15803D", "#4D7C0F", "#CA8A04", "#7C2D12", "#831843", "#581C87", "#1E3A8A",
  "#164E63", "#14532D", "#365314", "#713F12", "#E11D48", "#D97706", "#7E22CE", "#475569",
];

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

type MaybeColor = string | null | undefined;

/** Màu chưa dùng đầu tiên trong bảng; hết màu thì lấy màu đang ít hũ dùng nhất (xoay vòng). */
export function nextJarColor(used: readonly MaybeColor[]): string {
  const counts = new Map<string, number>();
  for (const color of used) if (color) counts.set(color.toUpperCase(), (counts.get(color.toUpperCase()) ?? 0) + 1);
  let best = JAR_COLORS[0];
  let bestCount = Infinity;
  for (const color of JAR_COLORS) {
    const count = counts.get(color.toUpperCase()) ?? 0;
    if (count === 0) return color;
    if (count < bestCount) [best, bestCount] = [color, count];
  }
  return best;
}

/** Hũ trùng màu với hũ đứng trước thì lấy màu chưa ai dùng trong bảng, để biểu đồ vẫn tách được từng hũ. Chỉ đổi lúc hiển thị, không ghi lại vào DB. */
export function withDistinctJarColors<T extends { color: string }>(jars: readonly T[]): T[] {
  const used = jars.map((jar) => jar.color);
  const seen = new Set<string>();
  return jars.map((jar) => {
    if (!seen.has(jar.color.toUpperCase())) {
      seen.add(jar.color.toUpperCase());
      return jar;
    }
    const color = nextJarColor(used);
    used.push(color);
    seen.add(color.toUpperCase());
    return { ...jar, color };
  });
}

/** Chọn màu cho một lô hũ mới: giữ màu đã yêu cầu nếu hợp lệ và chưa hũ nào dùng, ngược lại cấp màu chưa dùng. `used` là màu các hũ đang có. */
export function pickJarColors(wanted: readonly MaybeColor[], used: readonly MaybeColor[]): string[] {
  const taken = [...used];
  return wanted.map((color) => {
    const keep = color && HEX_COLOR.test(color) && !taken.some((other) => other?.toUpperCase() === color.toUpperCase());
    const picked = keep ? color : nextJarColor(taken);
    taken.push(picked);
    return picked;
  });
}
