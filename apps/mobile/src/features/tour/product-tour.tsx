import { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";
import { PrimaryButton } from "@/components/auth-form";
import { TextButton } from "@/components/finance-ui";
import { tourSteps } from "./steps";

/** Hướng dẫn từng bước trên Tổng quan. Render khi cần mở; `onClose` gọi khi xong hoặc bỏ qua (kể cả nút Back của Android). */
export function ProductTour({ hasJars, onClose }: { hasJars: boolean; onClose(): void }) {
  const steps = tourSteps(hasJars);
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const last = index === steps.length - 1;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.card}>
          <Text style={styles.progress}>{`Bước ${index + 1}/${steps.length}`}</Text>
          <Text accessibilityRole="header" style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
          <PrimaryButton onPress={() => (last ? onClose() : setIndex(index + 1))}>{last ? "Xong" : "Tiếp"}</PrimaryButton>
          <View style={styles.row}>
            {index > 0 ? <TextButton label="Quay lại" onPress={() => setIndex(index - 1)} /> : <View />}
            {!last ? <TextButton label="Bỏ qua" onPress={onClose} /> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[6], backgroundColor: "rgba(32, 30, 29, 0.6)" },
  card: { width: "100%", maxWidth: 420, gap: spacing[3], padding: spacing[5], borderRadius: radii.card, backgroundColor: lightColors.surface },
  progress: { color: lightColors.textMuted, fontSize: typography.size.caption, fontWeight: "700" },
  title: { color: lightColors.text, fontSize: typography.size.heading, fontWeight: "800" },
  body: { color: lightColors.textMuted, fontSize: typography.size.body, lineHeight: 24 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
