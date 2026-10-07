import { MaterialIcons } from "@expo/vector-icons";

// Web lưu tên icon kiểu lucide trong jars.icon; mobile vẽ bằng MaterialIcons nên ánh xạ các tên đang dùng.
const GLYPHS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  utensils: "restaurant",
  house: "home",
  bus: "directions-bus",
  "shopping-bag": "shopping-bag",
  baby: "child-care",
  "graduation-cap": "school",
  "heart-pulse": "favorite",
  "piggy-bank": "savings",
  savings: "savings",
  wallet: "account-balance-wallet",
};

export function JarIcon({ icon, color, size = 24, isSavings = false }: { icon: string; color: string; size?: number; isSavings?: boolean }) {
  return <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name={GLYPHS[icon] ?? (isSavings ? "savings" : "account-balance-wallet")} size={size} color={color} />;
}
