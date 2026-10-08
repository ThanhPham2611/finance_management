import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { formatMoney, paceMessage, type SpendingPace } from "@hu/domain";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";

const TONES = {
  neutral: { bg: lightColors.surface, ink: lightColors.text, icon: "speed" },
  good: { bg: "#E4F0EA", ink: lightColors.success, icon: "check-circle" },
  warn: { bg: "#FBF1DD", ink: lightColors.warning, icon: "warning-amber" },
  danger: { bg: "#FDECEA", ink: lightColors.destructive, icon: "warning-amber" },
} as const;

const vnd = (value: number) => `${formatMoney(value)} ₫`;

/** Chia hết ngân sách các hũ ra từng ngày, so với tốc độ chi thực tế (cùng lời giải thích với web). */
export function SpendingPaceCard({ pace }: { pace: SpendingPace }) {
  const message = paceMessage(pace, vnd);
  if (!message) return null;
  const tone = TONES[message.tone];

  return (
    <View testID="spending-pace" accessibilityRole={message.tone === "danger" ? "alert" : undefined} style={[styles.card, { backgroundColor: tone.bg }]}>
      <View style={styles.top}>
        <MaterialIcons accessibilityElementsHidden importantForAccessibility="no" name={tone.icon} size={20} color={tone.ink} />
        <View style={styles.copy}>
          <Text style={[styles.eyebrow, { color: tone.ink }]}>CHI TIÊU MỖI NGÀY</Text>
          <Text style={[styles.title, { color: tone.ink }]}>{message.title}</Text>
          <Text style={[styles.detail, { color: tone.ink }]}>{message.detail}</Text>
        </View>
      </View>
      {pace.status !== "early" ? (
        <View style={styles.numbers}>
          <View style={styles.number}><Text style={[styles.label, { color: tone.ink }]}>Các hũ cho phép</Text><Text style={[styles.value, { color: tone.ink }]}>{`${vnd(pace.dailyBudget)}/ngày`}</Text></View>
          <View style={styles.number}><Text style={[styles.label, { color: tone.ink }]}>Bạn đang chi TB</Text><Text style={[styles.value, { color: tone.ink }]}>{`${vnd(pace.dailyAverage)}/ngày`}</Text></View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing[3], padding: spacing[3], borderRadius: radii.card, borderWidth: 1, borderColor: lightColors.border },
  top: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2] },
  copy: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1, opacity: 0.8 },
  title: { fontSize: typography.size.bodyLarge, fontWeight: "800" },
  detail: { fontSize: typography.size.body, lineHeight: 22 },
  numbers: { flexDirection: "row", gap: spacing[3], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.12)" },
  number: { flex: 1, gap: 2 },
  label: { fontSize: typography.size.caption, opacity: 0.8 },
  value: { fontSize: typography.size.body, fontWeight: "800", fontVariant: ["tabular-nums"] },
});
