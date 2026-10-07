import type { PropsWithChildren } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, type ScrollViewProps } from "react-native";
import { lightColors, spacing, typography } from "@hu/design-tokens";

export function Screen({ children, ...props }: PropsWithChildren<ScrollViewProps>) {
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      // Bàn phím mở thì chừa chỗ để cuộn tới nút Lưu/Đăng nhập nằm dưới ô đang nhập.
      automaticallyAdjustKeyboardInsets
      style={styles.root}
      contentContainerStyle={styles.content}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

export function LoadingScreen({ label = "Đang tải…" }: { label?: string }) {
  return (
    <View style={styles.loading} accessibilityRole="progressbar">
      <ActivityIndicator color={lightColors.primary} />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { flexGrow: 1, padding: spacing[4], paddingBottom: spacing[10], gap: spacing[4] },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing[3], backgroundColor: lightColors.background },
  loadingLabel: { color: lightColors.textMuted, fontSize: typography.size.body },
});
