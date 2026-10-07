import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { lightColors, radii, spacing, typography } from "@hu/design-tokens";

export function AuthField({
  label,
  value,
  onChangeText,
  secureTextEntry,
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText(value: string): void;
  secureTextEntry?: boolean;
  autoComplete?: "email" | "password" | "name" | "new-password";
}) {
  return (
    <View style={styles.field}>
      {/* Ô nhập mang tên "label" cho trình đọc màn hình; nhãn hiển thị bị ẩn để không đọc hai lần. */}
      <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoComplete === "email" ? "none" : "sentences"}
        autoCorrect={false}
        autoComplete={autoComplete}
        style={styles.input}
      />
    </View>
  );
}

export function PrimaryButton({ children, disabled, onPress }: { children: ReactNode; disabled?: boolean; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={styles.buttonText}>{children}</Text>
    </Pressable>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <View accessibilityRole="alert" style={styles.errorBox}>
      <Text style={styles.errorText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing[2] },
  label: { color: lightColors.text, fontSize: typography.size.body, fontWeight: "600" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: lightColors.border,
    borderRadius: radii.control,
    backgroundColor: lightColors.surface,
    color: lightColors.text,
    fontSize: typography.size.body,
    paddingHorizontal: spacing[3],
  },
  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control,
    backgroundColor: lightColors.primary,
    paddingHorizontal: spacing[4],
  },
  buttonText: { color: lightColors.onPrimary, fontSize: typography.size.body, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.82 },
  errorBox: { borderRadius: radii.control, backgroundColor: "#FDECEA", padding: spacing[3] },
  errorText: { color: lightColors.destructive, fontSize: typography.size.body },
});
